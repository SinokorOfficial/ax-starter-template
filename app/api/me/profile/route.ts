import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getCurrentSessionUser } from "@/lib/session";
import { getMyProfile } from "@/lib/graph";

// BFF — 본인 프로필(부서·직책 등). 세션 필수.
export async function GET(req: NextRequest) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const profile = await getMyProfile(jwt?.accessToken);
  return NextResponse.json({ profile });
}
