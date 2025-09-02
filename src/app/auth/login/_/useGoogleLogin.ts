"use client";

import { useEffect } from "react";

import type { CredentialResponse } from "google-one-tap";
import { clientSupabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    handleGoogleLogin?: (response: CredentialResponse) => void;
  }
}

export function useGoogleLogin() {
  const router = useRouter();

  useEffect(() => {
    if (window.handleGoogleLogin) return;

    window.handleGoogleLogin = async (response: CredentialResponse) => {
      if (!response.credential) {
        console.error("No credential received from Google");
        return;
      }

      const supabase = clientSupabase();
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });

      if (!error && data.user) {
        router.push("/");
      }
    };
  }, []);
}
