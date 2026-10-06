export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-[6px] tracking-tight cursor-pointer";
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5 h-7",
    md: "px-3.5 py-1.5 text-sm gap-2 h-8",
  };
  const variants = {
    primary:
      "bg-[#1d4033] text-white border border-[#1d4033] hover:bg-[#153026] active:bg-[#0f231b] shadow-none",
    ghost:
      "bg-white text-[#2a2a29] border border-[#e4e4e3] hover:bg-[#f4f4f3] hover:border-[#d0d0ce] active:bg-[#eaeae9]",
    subtle:
      "bg-[#f4f4f3] text-[#555552] border border-[#e4e4e3] hover:bg-[#eaeae9] hover:text-[#111110]",
    danger:
      "bg-white text-[#b91c1c] border border-[#fca5a5] hover:bg-[#fef2f2] active:bg-[#fee2e2]",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

