export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "subtle"; size?: "sm" | "md" }) {
  const base = "inline-flex items-center justify-center rounded-lg font-semibold transition disabled:opacity-60";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-black border border-slate-900",
    ghost: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
    subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent",
    danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
