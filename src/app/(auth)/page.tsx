import { createClient } from "@/utils/supabase/server";

export default async function MainPage() {
  const supabase = await createClient();
  const loginUser = await supabase.auth.getUser();
  console.log("🚀 ~ LoginPage ~ loginUser_", loginUser);

  return <>{JSON.stringify(loginUser)}</>;
}
