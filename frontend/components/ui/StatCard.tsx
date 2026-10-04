export function StatCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "slate" | "emerald" | "amber" | "violet";
}) {
  const toneMap: Record<string, string> = {
    slate: "bg-slate-50 border-slate-200",
    emerald: "bg-emerald-50 border-emerald-200",
    amber: "bg-amber-50 border-amber-200",
    violet: "bg-violet-50 border-violet-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-600">{hint}</div>}
    </div>
  );
}
