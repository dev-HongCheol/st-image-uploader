import React, { ReactNode } from "react";
import GoogleLoginButton from "../auth/login/_/components/GoogleLoginButton";
import { createClient } from "@/utils/supabase/server";
import AuthProvider from "./_components/AuthProvider";

type Props = {
  children: ReactNode;
};

const layout = async ({ children }: Props) => {
  const supabase = await createClient();
  const loginUser = await supabase.auth.getUser();

  if (!loginUser || loginUser.error) return <GoogleLoginButton />;
  return <AuthProvider>{children}</AuthProvider>;
};

export default layout;
