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
  metadata?: Record<string, any>;
};

const hasMissingColumnError = (message: string) =>
  /column/i.test(message) && /does not exist/i.test(message);

export async function safeInsertNotification(payload: NotificationInsertPayload) {
  const { error } = await supabase.from("notifications").insert(payload);
  if (!error || !hasMissingColumnError(String(error.message ?? ""))) return error ?? null;

  const fallbackPayload = {
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    action_id: payload.action_id ?? null,
    action_type: payload.action_type ?? null,
  };

  const { error: fallbackError } = await supabase.from("notifications").insert(fallbackPayload as any);
  return fallbackError ?? null;
}
