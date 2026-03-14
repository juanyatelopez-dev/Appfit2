import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppPageIntroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function AppPageIntro({
  eyebrow,
  title,
  description,
  icon,
  actions,
  className,
  titleClassName,
  descriptionClassName,
}: AppPageIntroProps) {
  return (
    <div className={cn("flex flex-col gap-4 px-1 xl:flex-row xl:items-start xl:justify-between", className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-primary/80">
            {icon}
            <span>{eyebrow}</span>
          </div>
        ) : null}
        <h1 className={cn("app-surface-heading text-3xl font-black uppercase tracking-tight md:text-4xl", titleClassName)}>
          {title}
        </h1>
        <p className={cn("app-surface-caption max-w-3xl text-sm uppercase tracking-[0.24em]", descriptionClassName)}>
          {description}
        </p>
      </div>
      {actions ? <div className="shrink-0 self-start">{actions}</div> : null}
    </div>
  );
}
