"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import type { CredentialResponse } from "google-one-tap";

declare global {
  interface Window {
    handleGoogleLogin?: (response: CredentialResponse) => void;
  }
}

export function useGoogleLogin() {
  useEffect(() => {
    if (window.handleGoogleLogin) return;

    window.handleGoogleLogin = async (response: CredentialResponse) => {
      if (!response.credential) {
        console.error("No credential received from Google");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });

      if (!error) {
      }
    };
  }, []);
}
