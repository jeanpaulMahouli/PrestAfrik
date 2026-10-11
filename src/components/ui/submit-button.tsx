"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  loading = false,
  pendingLabel = "Chargement…",
  disabled,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isPending = pending || loading;

  return (
    <button
      {...props}
      aria-busy={isPending || undefined}
      disabled={disabled || isPending}
      type={type}
    >
      {isPending && <span aria-hidden="true" className="loading-spinner loading-spinner-inline" />}
      {isPending ? pendingLabel : children}
    </button>
  );
}
