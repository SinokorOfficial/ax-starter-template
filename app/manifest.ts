import type { MetadataRoute } from "next";

// PWA 매니페스트 — '홈 화면에 추가' 시 독립 실행(standalone) 앱처럼 동작.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SINOKOR AX",
    short_name: "SINOKOR AX",
    description: "SINOKOR AX 사내 앱",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#2563EB",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
