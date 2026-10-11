import { StoreRole } from "@prisma/client";
import { z } from "zod";

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const invitationIdSchema = z.string().cuid();
export const membershipIdSchema = z.string().cuid();
export const inviteTeamMemberSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum([StoreRole.MANAGER, StoreRole.ORDER_PREPARER]),
});
export const updateMemberRoleSchema = z.object({
  membershipId: membershipIdSchema,
  role: z.enum([StoreRole.MANAGER, StoreRole.ORDER_PREPARER]),
});
