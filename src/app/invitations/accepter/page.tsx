import Link from "next/link";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { auth } from "@/modules/auth/server";
import { acceptTeamInvitation } from "@/modules/team/actions";
import { invitationTokenSchema } from "@/modules/team/validation";
import { prisma } from "@/lib/prisma";

type InvitationPageProps = PageProps<"/invitations/accepter">;

const invitationErrors: Record<string, string> = {
  adresse: "Connecte-toi avec l’adresse e-mail à laquelle l’invitation a été envoyée.",
  quota: "Le quota de membres de cette boutique est atteint. Le propriétaire doit libérer une place ou choisir une offre supérieure.",
};

export default async function AcceptInvitationPage({
  searchParams,
}: InvitationPageProps) {
  const params = await searchParams;
  const parsedToken = invitationTokenSchema.safeParse(params.token);
  if (!parsedToken.success) notFound();

  const tokenHash = createHash("sha256").update(parsedToken.data).digest("hex");
  const [session, invitation] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    prisma.storeInvitation.findUnique({
      where: { token: tokenHash },
      select: {
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        acceptedById: true,
        store: { select: { name: true } },
      },
    }),
  ]);
  if (!invitation) {
    return (
      <InvitationMessage
        heading="Invitation introuvable"
        message="Ce lien est invalide ou a été annulé."
      />
    );
  }

  if (invitation.acceptedAt) {
    if (session?.user.id === invitation.acceptedById) {
      return (
        <InvitationMessage
          heading="Invitation déjà acceptée"
          message={`Tu as déjà rejoint ${invitation.store.name}.`}
          actionHref="/dashboard"
          actionLabel="Ouvrir le tableau de bord"
        />
      );
    }
    return (
      <InvitationMessage
        heading="Invitation déjà utilisée"
        message="Ce lien à usage unique a déjà été accepté."
      />
    );
  }

  if (invitation.expiresAt <= new Date()) {
    return (
      <InvitationMessage
        heading="Invitation expirée"
        message="Demande au propriétaire de la boutique de renvoyer une invitation."
      />
    );
  }

  if (!session) {
    const signInHref = `/connexion?invitation=${encodeURIComponent(parsedToken.data)}`;
    const signUpHref = `/inscription?invitation=${encodeURIComponent(parsedToken.data)}`;
    return (
      <InvitationMessage
        heading={`Rejoins ${invitation.store.name}`}
        message={`Connecte-toi ou crée un compte avec l’adresse ${invitation.email} pour accepter cette invitation.`}
        actionHref={signInHref}
        actionLabel="Me connecter"
        secondaryHref={signUpHref}
        secondaryLabel="Créer un compte"
      />
    );
  }

  const wrongAccount =
    session.user.email.toLowerCase() !== invitation.email.toLowerCase();
  const error = typeof params.erreur === "string" ? invitationErrors[params.erreur] : undefined;
  if (wrongAccount) {
    return (
      <InvitationMessage
        heading={`Invitation pour ${invitation.store.name}`}
        message={`Cette invitation est destinée à ${invitation.email}. Déconnecte-toi, puis utilise le bon compte.`}
        actionHref="/dashboard"
        actionLabel="Retour au tableau de bord"
      >
        {error && <p className="form-error" role="alert">{error}</p>}
      </InvitationMessage>
    );
  }

  return (
    <main className="auth-main">
      <section className="auth-card invitation-card">
        <p className="text-link">PrestAfrik · Mon équipe</p>
        <h1 className="dashboard-heading">Rejoins {invitation.store.name}</h1>
        <p className="auth-subtitle">
          Invitation pour <strong>{invitation.email}</strong>. Ton rôle sera{" "}
          <strong>{invitation.role === "MANAGER" ? "Gestionnaire" : "Préparateur de commandes"}</strong>.
        </p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form action={acceptTeamInvitation}>
          <input name="token" type="hidden" value={parsedToken.data} />
          <SubmitButton className="primary-button full-width" pendingLabel="Acceptation…">
            Accepter l’invitation
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}

function InvitationMessage({
  heading,
  message,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: {
  heading: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="auth-main">
      <section className="auth-card invitation-card">
        <p className="text-link">PrestAfrik · Mon équipe</p>
        <h1 className="dashboard-heading">{heading}</h1>
        <p className="auth-subtitle">{message}</p>
        {children}
        <div className="invitation-actions">
          {actionHref && actionLabel && (
            <Link className="primary-button" href={actionHref}>{actionLabel}</Link>
          )}
          {secondaryHref && secondaryLabel && (
            <Link className="secondary-button" href={secondaryHref}>{secondaryLabel}</Link>
          )}
        </div>
      </section>
    </main>
  );
}
