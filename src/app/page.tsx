import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export default async function Home() {
  const supabase = createClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return <></>;
}
