export function TableWrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-[8px] border border-[#e4e4e3] bg-white ${className}`}>
      {children}
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-[#e4e4e3] bg-[#fafafa] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#737370] whitespace-nowrap select-none ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-b border-[#f0f0ef] px-3.5 py-2 text-xs text-[#2a2a29] whitespace-nowrap ${className}`}
    >
      {children}
    </td>
  );
}

