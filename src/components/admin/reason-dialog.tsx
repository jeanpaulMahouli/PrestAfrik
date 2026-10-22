"use client";

import { ActionDialog } from "@/components/ui/action-dialog";

/** Action sensible (suspension) : motif obligatoire et confirmation explicite. */
export function ReasonDialog({
  action,
  triggerLabel,
  title,
  description,
  submitLabel,
  hiddenFields,
  placeholder,
}: {
  action: (formData: FormData) => void | Promise<void>;
  triggerLabel: string;
  title: string;
  description: string;
  submitLabel: string;
  hiddenFields: Record<string, string>;
  placeholder: string;
}) {
  return (
    <ActionDialog
      action={action}
      description={description}
      hiddenFields={hiddenFields}
      submitClassName="btn btn-danger"
      submitLabel={submitLabel}
      title={title}
      triggerClassName="v-link-button admin-row-action"
      triggerLabel={triggerLabel}
    >
      <label className="form-field">
        Motif (communiqué à la personne concernée)
        <textarea maxLength={300} minLength={5} name="reason" placeholder={placeholder} required rows={3} />
      </label>
    </ActionDialog>
  );
}
