"use client";

import { createClient } from "@/utils/supabase/client";
import React from "react";

function page() {
  const handleLogin = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    console.log("🚀 ~ handleLogin ~ data_", data);
  };

  return <button onClick={handleLogin}>login</button>;
}

export default page;
