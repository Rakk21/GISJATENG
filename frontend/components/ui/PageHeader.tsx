import { Badge } from "./Badge";

export function PageHeader({
  title,
  desc,
  description,
  badge,
  actions,
  action,
}: {
  title: string;
  desc?: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const text = desc ?? description;
  const act = actions ?? action;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4e4e3]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-base font-semibold tracking-tight text-[#111110]">{title}</h1>
          {badge && <Badge tone="slate">{badge}</Badge>}
        </div>
        {text && <p className="mt-0.5 text-xs text-[#737370] leading-normal">{text}</p>}
      </div>
      {act && <div className="flex shrink-0 items-center gap-2">{act}</div>}
    </div>
  );
}

