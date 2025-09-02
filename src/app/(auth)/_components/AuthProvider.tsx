"use client";

import ROUTE from "@/constants/routes";
import { clientSupabase } from "@/utils/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import React, { ReactNode, useEffect } from "react";

type Props = {
  children: ReactNode;
};
const AuthProvider = ({ children }: Props) => {
  const router = useRouter();
  const supabase = clientSupabase();
  const pathname = usePathname();

  const LoginCheck = async () => {
    const user = await supabase.auth.getUser();

    if (!user || user.error) router.push(ROUTE.auth.login.path);
  };

  useEffect(() => {
    LoginCheck();
  }, [pathname]);

  //   로그인 상태가 변경되면
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.push(ROUTE.auth.login.path);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [router, supabase.auth]);
  return <>{children}</>;
};

export default AuthProvider;
