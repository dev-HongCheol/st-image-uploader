import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _clientSupabase: SupabaseClient<any, "public", "public", any, any> | null =
  null;

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
export const clientSupabase = () => {
  if (!_clientSupabase) {
    _clientSupabase = createClient();
  }
  return _clientSupabase;
};
