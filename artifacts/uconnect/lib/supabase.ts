import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

function normalizeEnv(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

const SUPABASE_URL = normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!HAS_SUPABASE_CONFIG) {
  console.error(
    "Supabase is not configured. EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required; auth and sync features are disabled.",
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? "https://unconfigured.supabase.invalid",
  SUPABASE_ANON_KEY ?? "UNCONFIGURED_SUPABASE_KEY",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    ...(HAS_SUPABASE_CONFIG
      ? {}
      : {
          global: {
            fetch: async (input) => {
              const target =
                typeof input === "string"
                  ? input
                  : input instanceof URL
                    ? input.toString()
                    : typeof input?.url === "string"
                      ? input.url
                      : "unknown";
              throw new Error(
                `Supabase is not configured for request: ${target}. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.`,
              );
            },
          },
        }),
  },
);
