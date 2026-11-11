import { BellRing, Send, Smartphone, Users } from "lucide-react";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/modules/admin/context";
import { broadcastPush, lastManualPush, resetPushTemplate, updatePushTemplate } from "@/modules/push/admin-actions";
import { getPushTemplate, isPushConfigured } from "@/modules/push/sender";
import { defaultPushTemplates, pushKindInfo, pushKinds } from "@/modules/push/templates";

export const metadata = { title: "Notifications push" };

/**
 * Administration → Notifications push : textes des notifications automatiques (rappel d'absence, nouvelle
 * commande, nouveau message), envoi manuel d'une nouveauté, et historique des envois.
 */
export default async function AdminPushPage({ searchParams }: PageProps<"/admin/notifications-push">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const configured = isPushConfigured();
  const [templates, devices, vendors, logs, customized, last] = await Promise.all([
    Promise.all(pushKinds.map((kind) => getPushTemplate(kind))),
    prisma.pushSubscription.count(),
    prisma.user.count({ where: { pushSubscriptions: { some: {} } } }),
    prisma.pushNotificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.pushNotificationTemplate.findMany({ select: { kind: true } }),
    lastManualPush(),
  ]);
  const customizedKinds = new Set(customized.map((row) => row.kind));
  const automatic = templates.filter((template) => template.kind !== "NEWS");
  const news = templates.find((template) => template.kind === "NEWS") ?? defaultPushTemplates.NEWS;
  // Le formulaire reprend le dernier message envoyé (essai compris), sinon le texte « Nouveauté ».
  const draft = last ? { title: last.title, body: last.body, url: last.url ?? news.url, image: last.imageUrl } : { ...news, image: null };

  return (
    <>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Notifications push</h1>
          <p className="v-page-subtitle">Les messages qui s’affichent sur le téléphone ou l’ordinateur des vendeurs, même application fermée.</p>
        </div>
      </div>
      <AdminFeedback params={params} />
      {!configured && (
        <p className="v-banner v-banner-danger">
          Les notifications ne sont pas encore configurées : créez les clés avec <code>npx web-push generate-vapid-keys</code>, puis ajoutez <code>VAPID_PUBLIC_KEY</code> et{" "}
          <code>VAPID_PRIVATE_KEY</code> dans l’environnement du serveur et redémarrez-le. Les vendeurs verront alors le bouton « Activer les notifications ».
        </p>
      )}

      <section aria-label="Abonnés" className="kpi-grid">
        <KpiCard icon={Users} label="Vendeurs abonnés" value={formatNumber(vendors)} />
        <KpiCard icon={Smartphone} label="Appareils abonnés" tone="navy" value={formatNumber(devices)} />
        <KpiCard icon={BellRing} label="Envois récents" tone="blue" value={formatNumber(logs.length)} hint="20 derniers au plus" />
      </section>

      <section aria-labelledby="push-news" className="v-card">
        <h2 className="v-card-title" id="push-news">
          <Send aria-hidden="true" size={18} /> Envoyer une nouveauté
        </h2>
        <p className="v-small v-muted">
          À tous les vendeurs qui ont activé les notifications. Variables : <code>{"{prenom}"}</code>, <code>{"{boutique}"}</code>. Utilisez « Essai » pour la recevoir d’abord sur vos propres appareils.
        </p>
        <form action={broadcastPush} className="push-admin-form" encType="multipart/form-data">
          <PushFields body={draft.body} title={draft.title} url={draft.url} />
          <div className="v-field">
            Photo (facultative)
            {draft.image && (
              <label className="push-admin-photo">
                {/* Photo déjà optimisée (WebP 1200 × 600). */}
                <img alt="" height={60} src={draft.image} width={120} />
                <span className="v-check">
                  <input defaultChecked name="keepImage" type="checkbox" /> Garder la photo du dernier envoi
                </span>
              </label>
            )}
            <input accept="image/png,image/jpeg,image/webp" name="image" type="file" />
            <span className="v-field-help">
              Grande image sous le texte (recadrée en 1200 × 600 px, 2 Mo au plus). Sans photo, la notification montre le logo PrestAfrik. Elle ne s’affiche pas sur iPhone.
            </span>
          </div>
          <div className="push-admin-actions">
            <SubmitButton className="btn btn-secondary" name="mode" pendingLabel="Envoi…" value="test">
              Essai sur mes appareils
            </SubmitButton>
            <SubmitButton className="btn btn-primary" disabled={!configured} name="mode" pendingLabel="Envoi…" value="all">
              Envoyer à tous les vendeurs
            </SubmitButton>
          </div>
        </form>
      </section>

      <h2 className="push-admin-title">Textes des notifications</h2>
      <div className="push-admin-grid">
        {[...automatic, news].map((template) => {
          const info = pushKindInfo[template.kind];
          return (
            <section aria-labelledby={`push-${template.kind}`} className="v-card" key={template.kind}>
              <div className="push-admin-head">
                <h3 className="v-card-title" id={`push-${template.kind}`}>
                  {info.label}
                </h3>
                <Badge tone={template.enabled ? "success" : "neutral"}>{template.enabled ? "Active" : "Désactivée"}</Badge>
              </div>
              <p className="v-small v-muted">{info.when}</p>
              <form action={updatePushTemplate} className="push-admin-form">
                <input name="kind" type="hidden" value={template.kind} />
                <PushFields body={template.body} title={template.title} url={template.url} />
                <p className="v-small v-muted">
                  Variables :{" "}
                  {info.variables.map((name) => (
                    <code className="push-admin-var" key={name}>{`{${name}}`}</code>
                  ))}
                </p>
                {template.kind !== "NEWS" && (
                  <label className="v-check">
                    <input defaultChecked={template.enabled} name="enabled" type="checkbox" /> Envoyer automatiquement cette notification
                  </label>
                )}
                {template.kind === "NEWS" && <input name="enabled" type="hidden" value="on" />}
                <div className="push-admin-actions">
                  <SubmitButton className="btn btn-primary" pendingLabel="Enregistrement…">
                    Enregistrer
                  </SubmitButton>
                </div>
              </form>
              {customizedKinds.has(template.kind) && (
                <form action={resetPushTemplate}>
                  <input name="kind" type="hidden" value={template.kind} />
                  <SubmitButton className="v-link-button" pendingLabel="…">
                    Revenir au texte proposé par PrestAfrik
                  </SubmitButton>
                </form>
              )}
            </section>
          );
        })}
      </div>

      <section aria-labelledby="push-history" className="v-card v-card-flush">
        <h2 className="v-card-title admin-card-title" id="push-history">Derniers envois</h2>
        {logs.length ? (
          <table className="v-table admin-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Type</th>
                <th scope="col">Message</th>
                <th scope="col">Vendeurs</th>
                <th scope="col">Appareils atteints</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Date">{formatDateTime(log.createdAt)}</td>
                  <td data-label="Type">{pushKindInfo[log.kind].label}</td>
                  <td className="v-cell-primary" data-label="Message">
                    {log.title}
                    <span className="v-cell-sub">{log.body}</span>
                  </td>
                  <td data-label="Vendeurs">{formatNumber(log.recipients)}</td>
                  <td data-label="Appareils atteints">{formatNumber(log.delivered)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="v-muted admin-card-empty">Aucune notification envoyée pour le moment.</p>
        )}
      </section>
    </>
  );
}

function PushFields({ title, body, url }: { title: string; body: string; url: string }) {
  return (
    <>
      <label className="v-field">
        Titre
        <input defaultValue={title} maxLength={80} minLength={3} name="title" required />
      </label>
      <label className="v-field">
        Message
        <textarea defaultValue={body} maxLength={240} minLength={5} name="body" required rows={3} />
      </label>
      <label className="v-field">
        Page ouverte au clic
        <input defaultValue={url} maxLength={200} name="url" pattern="/.*" required />
        <span className="v-field-help">Une page de l’espace vendeur, par exemple /dashboard ou /dashboard/commandes.</span>
      </label>
    </>
  );
}
