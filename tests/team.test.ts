import { describe, expect, it } from "vitest";
import { invitationTokenSchema, inviteTeamMemberSchema } from "../src/modules/team/validation";

describe("invitations de l’équipe", () => {
  it("n’accepte que les rôles non propriétaires et les e-mails valides", () => {
    expect(
      inviteTeamMemberSchema.safeParse({
        email: "Awa@example.test",
        role: "MANAGER",
      }).success,
    ).toBe(true);
    expect(
      inviteTeamMemberSchema.safeParse({
        email: "awa@example.test",
        role: "OWNER",
      }).success,
    ).toBe(false);
  });

  it("valide le format des liens d’invitation à usage unique", () => {
    expect(invitationTokenSchema.safeParse("a".repeat(43)).success).toBe(true);
    expect(invitationTokenSchema.safeParse("not-a-token").success).toBe(false);
  });
});
