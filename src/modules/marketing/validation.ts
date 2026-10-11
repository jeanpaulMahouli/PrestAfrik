import { z } from "zod";
import { marketingAudiences } from "./audience";

export const marketingCampaignSchema = z.object({
  name: z.string().trim().min(2).max(100),
  audience: z.enum(marketingAudiences),
  message: z.string().trim().min(2).max(1000),
  recipientLimit: z.coerce.number().int().min(1).max(10_000),
});

export const campaignIdSchema = z.string().cuid();
