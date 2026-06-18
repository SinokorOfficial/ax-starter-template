import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

// 인증 필수 셸. 비로그인 → NextAuth 로그인으로.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
