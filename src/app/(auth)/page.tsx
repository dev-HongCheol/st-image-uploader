import { BUCKET_NAMES } from "@/constants/common";
import { createClient } from "@/utils/supabase/server";

export default async function MainPage() {
  const supabase = await createClient();
  const loginUser = await supabase.auth.getUser();

  const images = await supabase.storage
    .from(BUCKET_NAMES.ORIGINALS)
    .list(loginUser.data.user?.id, {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
  console.log("🚀 ~ MainPage ~ images_", images);

  return <>{JSON.stringify(loginUser)}</>;
}
