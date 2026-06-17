import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/** 서버 컴포넌트/route 에서 현재 로그인 사용자 조회 (없으면 null). */
export async function getCurrentSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
