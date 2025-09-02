"use client";
import Script from "next/script";
import React from "react";

function GoogleLoginButton() {
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" async />
      <div
        id="g_id_onload"
        data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        data-context="signin"
        data-ux_mode="popup"
        data-callback="handleGoogleLogin"
        data-itp_support="true"
      />

      <div
        className="g_id_signin"
        data-type="standard"
        data-shape="rectangular"
        data-theme="filled_black"
        data-text="signin_with"
        data-size="large"
        data-logo_alignment="left"
      />
    </>
  );
}

export default GoogleLoginButton;
