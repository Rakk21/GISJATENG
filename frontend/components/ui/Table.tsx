export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-auto rounded-xl border border-slate-200 bg-white">{children}</div>;
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap ${className}`}>{children}</th>;
}
export function Td({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap ${className}`}>{children}</td>;
}
