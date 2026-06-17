import createNextIntlPlugin from "next-intl/plugin";

// next-intl: URL 라우팅 없이 쿠키 기반 locale (i18n/request.ts 에서 결정)
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
