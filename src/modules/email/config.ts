import { z } from "zod";

const nonPlaceholder = (value: string) =>
  !/(?:set[-_]in[-_]|to[-_]complete|replace[-_]with|your[-_]domain|your[-_]provider|generate_|\.example(?:$|>))/i.test(
    value,
  );

const smtpEnvironmentSchema = z.object({
  SMTP_HOST: z.string().trim().min(1).refine(nonPlaceholder).refine((value) => !/[\s/:]/.test(value)),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: z.enum(["true", "false"]).transform((value) => value === "true"),
  SMTP_USER: z.string().trim().min(1).refine(nonPlaceholder),
  SMTP_PASSWORD: z.string().min(1).refine(nonPlaceholder).refine((value) => value.trim().length > 0),
  SMTP_FROM: z
    .string()
    .trim()
    .min(1)
    .refine(nonPlaceholder)
    .refine((value) => !/[\r\n]/.test(value))
    .refine((value) => /^[^<>\s@]+@[^<>\s@]+$/.test(value) || /^[^<>]*<[^<>\s@]+@[^<>\s@]+>$/.test(value)),
});

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

export function hasSmtpConfig(
  environment: Record<string, string | undefined> = process.env,
) {
  return smtpEnvironmentSchema.safeParse(environment).success;
}

export function getSmtpConfig(
  environment: Record<string, string | undefined> = process.env,
): SmtpConfig {
  const parsed = smtpEnvironmentSchema.safeParse(environment);
  if (!parsed.success) {
    const missing = [...new Set(parsed.error.issues.map((issue) => issue.path[0]?.toString()))];
    throw new Error(`Configuration SMTP absente ou invalide : ${missing.join(", ")}.`);
  }

  return {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    secure: parsed.data.SMTP_SECURE,
    user: parsed.data.SMTP_USER,
    password: parsed.data.SMTP_PASSWORD,
    from: parsed.data.SMTP_FROM,
  };
}
