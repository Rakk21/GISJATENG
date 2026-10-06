export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "violet" | "blue";
}) {
  const map: Record<string, string> = {
    slate: "bg-[#f4f4f3] text-[#555552] border-[#e4e4e3]",
    green: "bg-[#eaf1ed] text-[#1d4033] border-[#c2dad0]",
    amber: "bg-[#fef9ee] text-[#8a5d14] border-[#f6e4be]",
    violet: "bg-[#f6f5f9] text-[#4d4469] border-[#dfdbe8]",
    blue: "bg-[#f0f4f8] text-[#24527a] border-[#cde0f0]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium tracking-tight ${map[tone] || map.slate}`}
    >
      {children}
    </span>
  );
}

