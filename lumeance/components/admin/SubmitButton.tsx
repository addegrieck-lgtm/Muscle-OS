"use client";

import { useFormStatus } from "react-dom";
import { Btn } from "./ui";

export function SubmitButton({
  children,
  variant = "primary",
  confirm,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Btn
      type="submit"
      variant={variant}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Enregistrement…" : children}
    </Btn>
  );
}
