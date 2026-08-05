import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/login-form";

// 로그인 수단(ENTRA_*)을 런타임에 판단 → 정적 prerender 금지.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const t = await getTranslations();
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            AX
          </div>
          <h1 className="text-xl font-semibold">{t("auth.appName")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.loginDesc")}</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("footer.copyright")}
        </p>
      </div>
    </main>
  );
}
