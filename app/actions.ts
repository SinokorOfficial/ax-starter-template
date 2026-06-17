"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/request";

/** 언어 전환 — locale 쿠키 저장 후 전체 레이아웃 재검증.
 *  이 쿠키가 UI(next-intl) + 데이터 언어(BFF→Accept-Language) 둘 다 결정. */
export async function setLocale(locale: Locale) {
  if (!(LOCALES as readonly string[]).includes(locale)) return;
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
