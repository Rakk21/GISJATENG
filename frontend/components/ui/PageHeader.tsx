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
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{title}</h1>
          {badge && <Badge tone="slate">{badge}</Badge>}
        </div>
        {text && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{text}</p>}
      </div>
      {act && <div className="flex shrink-0 items-center gap-2">{act}</div>}
    </div>
  );
}
