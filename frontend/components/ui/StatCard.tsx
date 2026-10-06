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
  return (
    <div className="rounded-[8px] border border-[#e4e4e3] bg-white p-3.5 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#737370]">
          {label}
        </span>
        {tone === "emerald" && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1d4033]" />
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-[#111110] font-mono">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] text-[#888885] truncate">
          {hint}
        </div>
      )}
    </div>
  );
}

