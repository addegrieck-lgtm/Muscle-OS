import Link from "next/link";

export const inputClass =
  "w-full border border-brun/15 bg-white/70 px-3 py-2.5 text-sm text-brun outline-none transition focus:border-champagne focus:bg-white";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-brun/60">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-brun/45">{hint}</span>}
    </label>
  );
}

export function Card({
  title,
  children,
  actions,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-brun/10 bg-white/60 p-5 md:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="font-serif text-xl">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="font-serif text-4xl font-light">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brun/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Btn({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const v =
    variant === "primary"
      ? "bg-brun text-ivoire hover:bg-noir"
      : variant === "danger"
        ? "border border-[#8a3b2a]/40 text-[#8a3b2a] hover:bg-[#8a3b2a] hover:text-white"
        : "border border-brun/20 hover:border-brun";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition disabled:opacity-40 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function BtnLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const v =
    variant === "primary"
      ? "bg-brun text-ivoire hover:bg-noir"
      : "border border-brun/20 hover:border-brun";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition ${v}`}
    >
      {children}
    </Link>
  );
}

const BADGE: Record<string, string> = {
  published: "bg-[#e3ecd9] text-[#3c5a2b]",
  draft: "bg-brun/10 text-brun/70",
  archived: "bg-brun/5 text-brun/40",
  paid: "bg-[#e3ecd9] text-[#3c5a2b]",
  preparing: "bg-[#f3e6cc] text-[#7a5a1e]",
  shipped: "bg-[#dde6f0] text-[#2f4b6b]",
  delivered: "bg-[#e3ecd9] text-[#3c5a2b]",
  pending_payment: "bg-[#f3e6cc] text-[#7a5a1e]",
  cancelled: "bg-[#f2dcd6] text-[#8a3b2a]",
  refunded: "bg-[#f2dcd6] text-[#8a3b2a]",
  unpaid: "bg-brun/10 text-brun/70",
  pending: "bg-[#f3e6cc] text-[#7a5a1e]",
  failed: "bg-[#f2dcd6] text-[#8a3b2a]",
  partially_refunded: "bg-[#f3e6cc] text-[#7a5a1e]",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap px-2 py-0.5 text-[0.7rem] font-medium ${BADGE[value] ?? "bg-brun/10"}`}
    >
      {label ?? value}
    </span>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-6 border-l-2 px-4 py-3 text-sm ${error ? "border-[#8a3b2a] bg-[#f2dcd6]/60" : "border-champagne bg-creme"}`}
    >
      {error ?? ok}
    </div>
  );
}

export function Table({
  head,
  children,
  empty,
}: {
  head: string[];
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto border border-brun/10 bg-white/60">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-brun/10 text-[0.68rem] uppercase tracking-[0.14em] text-brun/55">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brun/5">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-sm text-brun/50">{empty}</p>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="border border-brun/10 bg-white/60 p-5">
      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-brun/55">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-brun/45">{hint}</p>}
    </div>
  );
}

/** Lit les messages flash transmis par redirection (?ok= / ?erreur=). */
export function flashFrom(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string).slice(0, 300) : undefined;
  return { ok: one("ok"), error: one("erreur") };
}
