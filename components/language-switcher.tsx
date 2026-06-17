"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { setLocale } from "@/app/actions";
import { cn } from "@/lib/utils";

const LANGS = [
  { cd: "ko", label: "한국어" },
  { cd: "en", label: "English" },
  { cd: "zh", label: "中文" },
  { cd: "ja", label: "日本語" },
] as const;

const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:bg-accent hover:text-foreground";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("header");
  const [pending, start] = useTransition();
  const item =
    "flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent";

  return (
    <Dropdown align="end" buttonClassName={iconBtn} trigger={<Globe className="h-4 w-4" />}>
      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        {t("language")}
      </div>
      {LANGS.map((l) => (
        <button
          key={l.cd}
          disabled={pending}
          onClick={() => start(() => setLocale(l.cd))}
          className={cn(item, locale === l.cd && "font-semibold")}
        >
          {l.label}
          {locale === l.cd && <span>✓</span>}
        </button>
      ))}
    </Dropdown>
  );
}
