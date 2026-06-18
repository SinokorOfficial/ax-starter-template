import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SINOKOR AX",
  description: "SINOKOR AX 사내 앱 스타터",
  manifest: "/manifest.webmanifest",
  // iOS '홈 화면에 추가' → 독립 실행 + 짧은 이름 + apple-touch-icon(app/apple-icon).
  appleWebApp: {
    capable: true,
    title: "SINOKOR AX",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  // 홈 화면 실행 시 노치/홈바 영역까지 안전하게.
  viewportFit: "cover",
};

// 하이드레이션 전 테마 적용(FOUC 방지)
const noFlashTheme = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
