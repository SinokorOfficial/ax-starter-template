"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const t = useTranslations("auth");
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/";
  return (
    <Button className="w-full" onClick={() => signIn("azure-ad", { callbackUrl })}>
      {t("login")}
    </Button>
  );
}
