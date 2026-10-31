import Link from "next/link";

type Variant = "solid" | "outline" | "ghost-light" | "outline-light";

const styles: Record<Variant, string> = {
  solid: "bg-brun text-ivoire hover:bg-noir",
  outline: "border border-brun/30 text-brun hover:border-brun hover:bg-brun hover:text-ivoire",
  "outline-light":
    "border border-ivoire/35 text-ivoire hover:border-champagne hover:bg-champagne/15",
  "ghost-light": "text-ivoire hover:text-champagne",
};

export const buttonClass = (variant: Variant = "solid", extra = "") =>
  `t-eyebrow group inline-flex items-center justify-center gap-4 px-8 py-4 transition-all duration-500 ease-[var(--ease-luxe)] disabled:pointer-events-none disabled:opacity-40 ${styles[variant]} ${extra}`;

export function ButtonLink({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
      <Arrow />
    </Link>
  );
}

export function Arrow() {
  return (
    <svg
      viewBox="0 0 28 8"
      className="h-2 w-7 transition-transform duration-500 ease-[var(--ease-luxe)] group-hover:translate-x-1.5"
      aria-hidden
    >
      <path d="M0 4h26M23 1l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

export function Eyebrow({
  children,
  className = "",
  number,
}: {
  children: React.ReactNode;
  className?: string;
  number?: string;
}) {
  return (
    <p className={`t-eyebrow flex items-center gap-4 text-champagne ${className}`}>
      {number && <span>{number}</span>}
      {number && <span className="h-px w-10 bg-current opacity-60" />}
      {children}
    </p>
  );
}
