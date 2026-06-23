import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";

// BFF — 본인 프로필 사진(Graph /me/photo). 세션 필수.
// 사진 없으면 Graph 가 404 → 그대로 전달해 클라이언트가 이니셜로 폴백.
export async function GET(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const token = jwt?.accessToken as string | undefined;
  if (!token) return new NextResponse(null, { status: 401 });

  const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return new NextResponse(null, { status: res.status });

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
