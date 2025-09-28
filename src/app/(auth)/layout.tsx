import { createClient } from "@/utils/supabase/server";
import { ReactNode } from "react";
import GoogleLoginButton from "../auth/login/_/components/GoogleLoginButton";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AuthProvider from "./_components/AuthProvider";
import AddFolderDialog from "./_components/header/AddFolderDialog";
import { AppSidebar } from "./_components/nav/AppSidebar";
import PathBreadcrumb from "./_components/header/PathBreadcrumb";

type Props = {
  children: ReactNode;
};

const layout = async ({ children }: Props) => {
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();

  if (!userRes || userRes.error) return <GoogleLoginButton />;
  return (
    <AuthProvider>
      <SidebarProvider>
        <AppSidebar user={userRes.data.user} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <PathBreadcrumb />
            <div className="ms-auto" />
            <AddFolderDialog />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
};

export default layout;
