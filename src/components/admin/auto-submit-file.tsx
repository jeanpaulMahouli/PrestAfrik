"use client";

import { ImagePlus } from "@/components/ui/icons";
import { useFormStatus } from "react-dom";

/** Choix d'image compact : le formulaire parent est envoyé dès qu'un fichier est choisi. */
export function AutoSubmitFile({ label, ariaLabel, name = "image" }: { label: string; ariaLabel: string; name?: string }) {
  const { pending } = useFormStatus();
  return (
    <label aria-busy={pending || undefined} className="mkt-file">
      <ImagePlus aria-hidden="true" size={15} /> {pending ? "Envoi…" : label}
      <input
        accept="image/png,image/jpeg,image/webp"
        aria-label={ariaLabel}
        disabled={pending}
        name={name}
        onChange={(event) => {
          if (event.currentTarget.files?.length) event.currentTarget.form?.requestSubmit();
        }}
        required
        type="file"
      />
    </label>
  );
}
