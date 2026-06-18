import { ImageResponse } from "next/og";

// iOS '홈 화면에 추가' 아이콘 (apple-touch-icon). 풀블리드 사각형 — iOS가 모서리 둥글림 처리.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563EB",
          color: "#ffffff",
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        AX
      </div>
    ),
    { ...size },
  );
}
