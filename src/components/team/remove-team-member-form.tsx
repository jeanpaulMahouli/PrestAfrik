"use client";

import { SubmitButton } from "@/components/ui/submit-button";
import { removeTeamMember } from "@/modules/team/actions";

export function RemoveTeamMemberForm({ membershipId }: { membershipId: string }) {
  return (
    <form
      action={removeTeamMember}
      onSubmit={(event) => {
        if (!window.confirm("Retirer ce membre de la boutique ? Son accès sera coupé immédiatement.")) {
          event.preventDefault();
        }
      }}
    >
      <input name="membershipId" type="hidden" value={membershipId} />
      <SubmitButton className="team-remove-button" pendingLabel="Retrait…">
        Retirer
      </SubmitButton>
    </form>
  );
}
