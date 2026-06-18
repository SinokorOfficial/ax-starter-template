# SINOKOR AX Starter Template

SINOKOR AX 사내 앱을 **바로 시작**하기 위한 스타터 템플릿입니다.
**Entra SSO 로그인 · 셸(헤더·사이드바·푸터) · My API(SSO 검증 데모) · M365(메일·일정) · 다국어(ko/en/zh/ja) · 다크모드**가 이미 동작합니다 — 교육생은 **기능 개발에만 집중**하면 됩니다.

## 스택
- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- NextAuth (Entra ID) — JWT 세션 + 자동 토큰 갱신
- next-intl — ko/en/zh/ja, 쿠키 기반 locale (URL 라우팅 없음)
- 사내 APIM **SSO 게이트웨이** 호출 (BFF, 토큰 캐시) — 키리스

---

## 🚀 교육생 빠른 시작

```bash
# 1) 이 템플릿으로 새 레포 생성 (GitHub "Use this template") 또는 클론
git clone <레포주소> my-app && cd my-app

# 2) 의존성 설치
npm install

# 3) 환경변수 — .env.local.example 복사 후 값 채우기 (값은 강사/관리자에게 받기)
cp .env.local.example .env.local

# 4) 실행
npm run dev
# → http://localhost:3000 → Microsoft 계정으로 로그인 → 코딩 시작!
```

`.env.local` 에 **직접 채워야 하는 값은 3개**뿐입니다 (나머지는 기본값 그대로 OK):
| 변수 | 채울 값 |
|---|---|
| ⭐ `NEXTAUTH_SECRET` | `openssl rand -base64 32` 로 생성 (앱마다 임의값) |
| ⭐ `ENTRA_CLIENT_ID` | 사용할 앱 등록의 client id — **강사/관리자에게 받기** |
| ⭐ `ENTRA_CLIENT_SECRET` | 위 앱 등록의 client secret — **받기 · 절대 커밋 금지** |

이미 채워져 있어 안 건드려도 되는 값: `NEXTAUTH_URL`(로컬), `ENTRA_TENANT_ID`(시노코 테넌트), `APIM_SP_URL`(SSO 엔드포인트). `APIM_SCOPE`·`APIM_PORTAL_KEY`는 **비워두기**(키리스).

> ⚠️ `ENTRA_CLIENT_SECRET` 은 **절대 레포에 커밋하지 마세요.** `.env.local` 은 `.gitignore` 에 포함돼 있습니다.

---

## ✅ 사전 준비 (Entra 쪽, 코드 밖 · 1회)

`.env.local` 을 채워도 아래가 안 돼 있으면 로그인/기능이 막힙니다. **공유 `SinokorAiPortal` 등록을 재사용하면 1·2는 보통 이미 돼 있습니다.**

1. **리디렉션 URI 등록** — 쓰는 앱 등록에 `<NEXTAUTH_URL>/api/auth/callback/azure-ad` 가 있어야 로그인 콜백이 됩니다.
   - 로컬: `http://localhost:3000/api/auth/callback/azure-ad`
   - 배포: `https://<운영도메인>/api/auth/callback/azure-ad`
2. **M365(메일·일정) 사용 시 — 관리자 동의** — 앱 등록 *API 권한*에 위임 권한 추가 + **관리자 동의**:
   - `Mail.Read` · `Mail.Send` · `Calendars.Read` (+ 기본 `User.Read` · `Chat.Read`)
   - 미동의 시: **로그인·My API 는 정상**, 메일/일정 화면만 권한 오류. 스코프 추가/동의 후엔 **로그아웃→재로그인** 해야 새 권한이 토큰에 반영됩니다.

| 하려는 것 | 필요 조건 |
|---|---|
| 로그인 + My API(SSO) | `.env.local` 3개 값 + 리디렉션 URI |
| + 메일/일정(M365) | 위 + M365 스코프 **관리자 동의** + 재로그인 |

---

## 🔐 Entra 앱 등록 — 두 가지 방식

| | A. 공유 등록 재사용 (교육·빠른 시작 ⭐) | B. 앱별 별도 등록 (운영·격리) |
|---|---|---|
| 새 앱 등록 | ❌ 불필요 | ✅ 필요 |
| `.env` client | 공유 `SinokorAiPortal` 값 | 자기 앱 값 |
| Redirect URI | 공유 등록에 도메인 추가 | 자기 등록에 추가 |
| APIM 호출 | 그대로 동작(audience 일치) | **공유 APIM API 에 pre-authorize** 필요 |
| 적합 | 실습·내부 도구 | 최소권한·민감 앱 |

- **로컬 실습**은 모두 `http://localhost:3000` 을 쓰므로, 공유 등록에 redirect URI `http://localhost:3000/api/auth/callback/azure-ad` 가 한 번 등록돼 있으면 추가 작업이 없습니다.
- **특수 권한(좁은 Graph 권한·시크릿 격리)** 이 필요해지면 그때 별도 등록하고, 그 client 를 공유 APIM API 에 pre-authorize 하면 됩니다.

---

## 🗂 구조
```
app/
  layout.tsx              # 세션·테마·i18n provider + lang
  icon.svg                # 파비콘 (AX)
  (app)/layout.tsx        # 인증 셸 (헤더 + 사이드바)
  (app)/my-api/page.tsx   # SSO 검증 데모
  (app)/me/mail/page.tsx  # M365 메일 (목록·본문·발신·회신)
  (app)/me/calendar/page.tsx # M365 일정 (캘린더·리스트)
  api/auth/[...]          # NextAuth (Entra)
  api/me/profile          # Graph /me (헤더 프로필)
  api/me/teams-chats      # Graph /me/chats (헤더 안읽음)
  api/me/messages, .../events # BFF → Graph (메일·일정, 위임)
  api/internal            # BFF → APIM (SSO, 토큰 캐시)
  actions.ts              # setLocale 서버액션
components/               # header, sidebar, my-api-list, page-header, language-switcher, ui/*
lib/                      # auth, apim, graph, portal-client, types, session, utils
i18n/ · messages/         # next-intl (ko/en/zh/ja)
```

## ➕ 새 메뉴/화면 추가
1. `components/sidebar.tsx` 의 `groups` 에서 해당 그룹 `items` 에 `{ href, label, icon }` 추가 (새 그룹이면 `{ label, items }` 추가)
2. `app/(app)/<route>/page.tsx` 생성
3. 문구는 `messages/*.json` 에 **4개 언어 같은 키**로 추가 후 `useTranslations()` 로 사용

## 🌐 다국어 (i18n)
- 헤더 🌐 토글 → `locale` 쿠키 → **UI(next-intl)** + **데이터 언어** 동시 결정
- 데이터: BFF 가 locale 을 `Accept-Language` 로 APIM 에 전달 → 백엔드가 `SSO_LANG_CD`(ko/en/zh/ja)
- 문구 추가: `messages/{ko,en,zh,ja}.json` 에 **같은 키**로 값 추가 → `t("키")`
- 언어 추가: `messages/<코드>.json` 생성 + `i18n/request.ts` `LOCALES` + `language-switcher.tsx` `LANGS` 에 추가

## 📞 사내 API 호출 (SSO)
```ts
// 브라우저(클라이언트)는 BFF 만 호출 — 토큰/시크릿은 서버에서 처리
const res = await fetch("/api/internal", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "same-origin",
  body: JSON.stringify({ user_name, package_name, procedure_name, params }),
});
```
서버(`app/api/internal/route.ts`)가 로그인 토큰으로 APIM `/sso/v1/internal` 을 호출합니다. 백엔드는 토큰에서 `SSO_OID/SSO_UPN/SSO_EMAIL/SSO_LANG_CD` 를 받아 신원을 식별합니다(키 불필요).

## ☁️ 배포 (Azure Container Apps)
SSO 전용 특별 설정은 없습니다. 다음만 하면 됩니다:
1. **Entra**: 운영 도메인 redirect URI 추가 (`https://<도메인>/api/auth/callback/azure-ad`)
2. **ACA env**: `NEXTAUTH_URL`(운영 도메인) · `NEXTAUTH_SECRET` · `ENTRA_*` · (필요시 `APIM_SCOPE`)
3. (선택) IP 제한은 ACA ingress access-restriction 으로

---
© 2026 SINOKOR. All rights reserved.
