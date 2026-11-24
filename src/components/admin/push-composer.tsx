"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { broadcastPush } from "@/modules/push/admin-actions";

type AudienceOption = { key: string; label: string; help: string; people: number; push: number };

/**
 * Composer d'un envoi manuel : type (nouveauté ou astuce), public, texte, page ouverte au clic, photo,
 * et aperçu en direct de la notification telle que le vendeur la verra.
 */
export function PushComposer({
  audiences,
  draft,
  pushConfigured,
  recentAudiences,
}: {
  audiences: AudienceOption[];
  draft: { title: string; body: string; url: string; image: string | null };
  pushConfigured: boolean;
  /** Publics ayant déjà reçu un envoi ces dernières 24 h (confirmation demandée). */
  recentAudiences: string[];
}) {
  const [kind, setKind] = useState<"NEWS" | "TIP">("NEWS");
  const [audience, setAudience] = useState("tous");
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const selected = audiences.find((option) => option.key === audience);
  const sample = (text: string) => text.replaceAll("{prenom}", "Aïcha").replaceAll("{boutique}", "Mboa Style");

  return (
    <div className="push-composer">
      <form action={broadcastPush} className="push-admin-form" encType="multipart/form-data">
        <fieldset className="push-kind">
          <legend>Type</legend>
          {(
            [
              ["NEWS", "Nouveauté"],
              ["TIP", "Astuce"],
            ] as const
          ).map(([value, label]) => (
            <label className={`inbox-chip${kind === value ? " is-active" : ""}`} key={value}>
              <input checked={kind === value} className="visually-hidden" name="kind" onChange={() => setKind(value)} type="radio" value={value} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="v-field">
          Public
          <select name="audience" onChange={(event) => setAudience(event.target.value)} value={audience}>
            {audiences.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label} ({option.people})
              </option>
            ))}
          </select>
          {selected && (
            <span className="v-field-help">
              {selected.help} {selected.push} reçoivent aussi les push.
            </span>
          )}
        </label>
        <label className="v-field">
          Titre
          <input maxLength={80} minLength={3} name="title" onChange={(event) => setTitle(event.target.value)} required value={title} />
        </label>
        <label className="v-field">
          Message
          <textarea maxLength={240} minLength={5} name="body" onChange={(event) => setBody(event.target.value)} required rows={3} value={body} />
          <span className="v-field-help">
            {body.length} / 240 · variables <code>{"{prenom}"}</code> <code>{"{boutique}"}</code>
          </span>
        </label>
        <label className="v-field">
          Page ouverte au clic
          <input defaultValue={draft.url} maxLength={200} name="url" pattern="/.*" required />
        </label>
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
        </div>
        <label className="v-check">
          <input defaultChecked={pushConfigured} disabled={!pushConfigured} name="push" type="checkbox" /> Aussi en notification push
          {!pushConfigured && <small className="v-muted"> (non configurées)</small>}
        </label>
        {recentAudiences.includes(audience) && (
          <label className="v-check push-repeat">
            <input name="confirmRepeat" type="checkbox" /> Je confirme un nouvel envoi à ce public aujourd’hui
          </label>
        )}
        <div className="push-admin-actions">
          <SubmitButton className="btn btn-secondary" name="mode" pendingLabel="Envoi…" value="test">
            M’envoyer un essai
          </SubmitButton>
          <SubmitButton className="btn btn-primary" name="mode" pendingLabel="Envoi…" value="all">
            Envoyer à {selected?.people ?? 0} vendeur{(selected?.people ?? 0) > 1 ? "s" : ""}
          </SubmitButton>
        </div>
      </form>

      <aside aria-label="Aperçu" className="push-preview">
        <p className="v-small v-muted">Aperçu</p>
        <div className="push-preview-card">
          <span aria-hidden="true" className="push-preview-icon">
            P
          </span>
          <div>
            <strong>{sample(title) || "Titre"}</strong>
            <p>{sample(body) || "Message"}</p>
            <small>PrestAfrik · maintenant</small>
          </div>
        </div>
        <p className="v-small v-muted">{kind === "TIP" ? "Rangé dans « Astuces »" : "Rangé dans « Nouveautés »"} dans la cloche du vendeur.</p>
      </aside>
    </div>
  );
}
