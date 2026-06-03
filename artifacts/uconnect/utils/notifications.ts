import { supabase } from "@/lib/supabase";

type NotificationInsertPayload = {
  user_id: string;
  type: string;
  title: string;
  body: string;
  action_id?: string | null;
  action_type?: string | null;
  redirect_path?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  secondary_entity_type?: string | null;
  secondary_entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

let createNotificationRpcSupported: boolean | null = null;

const hasMissingColumnError = (message: string) =>
  /column/i.test(message) && /does not exist/i.test(message);
const hasMissingFunctionError = (message: string) =>
  /function/i.test(message) && (/does not exist/i.test(message) || /not found/i.test(message));
const hasPermissionError = (message: string) =>
  /row-level security|permission denied|not allowed|violates row-level security/i.test(message);

export async function safeInsertNotification(payload: NotificationInsertPayload) {
  if (createNotificationRpcSupported !== false) {
    const rpcArgs = {
      p_user_id: payload.user_id,
      p_type: payload.type,
      p_title: payload.title,
      p_body: payload.body,
      p_action_id: payload.action_id ?? null,
      p_action_type: payload.action_type ?? null,
      p_redirect_path: payload.redirect_path ?? null,
      p_entity_type: payload.entity_type ?? null,
      p_entity_id: payload.entity_id ?? null,
      p_secondary_entity_type: payload.secondary_entity_type ?? null,
      p_secondary_entity_id: payload.secondary_entity_id ?? null,
      p_metadata: payload.metadata ?? {},
    };

    // Preferred path: security-definer RPC (supports cross-user notifications safely).
    const { error: rpcError } = await supabase.rpc("create_notification", rpcArgs);
    if (!rpcError) {
      createNotificationRpcSupported = true;
      return null;
    }
    const rpcMessage = String(rpcError.message ?? "");
    if (!hasMissingFunctionError(rpcMessage)) return rpcError;
    createNotificationRpcSupported = false;
  }

  const tryInsert = async (insertPayload: Record<string, unknown>) => {
    const { error } = await supabase.from("notifications").insert(insertPayload);
    return error ?? null;
  };

  let error = await tryInsert(payload as Record<string, unknown>);
  if (!error || !hasMissingColumnError(String(error.message ?? ""))) return error;

  const fallbackPayloadWithAction = {
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    action_id: payload.action_id ?? null,
    action_type: payload.action_type ?? null,
  };
  error = await tryInsert(fallbackPayloadWithAction);
  if (!error || !hasMissingColumnError(String(error.message ?? ""))) return error;

  const fallbackPayloadBase = {
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
  };
  error = await tryInsert(fallbackPayloadBase);

  if (error && hasPermissionError(String(error.message ?? ""))) {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (currentUserId && currentUserId !== payload.user_id) {
      return {
        ...error,
        message:
          "Cross-user notifications are blocked by RLS. Run the SQL patch that adds create_notification() and notification policies.",
      } as unknown;
    }
  }

  return error;
}
