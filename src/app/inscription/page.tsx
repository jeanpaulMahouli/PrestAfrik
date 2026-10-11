import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function SignUpPage({
  searchParams,
}: PageProps<"/inscription">) {
  const params = await searchParams;
  const invitationToken =
    typeof params.invitation === "string" ? params.invitation : undefined;

  return (
    <AuthShell
      heading="Crée ton compte"
      message="Un mois d’essai gratuit, sans engagement."
    >
      <AuthForm mode="sign-up" invitationToken={invitationToken} />
    </AuthShell>
  );
}
