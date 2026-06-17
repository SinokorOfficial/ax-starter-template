import { redirect } from "next/navigation";

// 루트 → 기본 화면(My API). 인증은 (app)/layout 에서 처리.
export default function Root() {
  redirect("/my-api");
}
