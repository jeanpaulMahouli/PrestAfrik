"use client";

import { Eye, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState, type FormEvent } from "react";
import { FramedImageInput } from "@/components/merchandising/framed-image-input";
import { LinkPicker, type LinkPickerTargets, type LinkPickerValue } from "@/components/merchandising/link-picker";
import { PopupCard } from "@/components/storefront/store-popup";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { StoreImage } from "@/components/ui/store-image";
import { SubmitButton } from "@/components/ui/submit-button";
import { deletePopup, savePopup, togglePopup } from "@/modules/merchandising/popup-actions";
import { linkFields, popupFieldsSchema, popupFrame } from "@/modules/merchandising/validation";

export type ManagedPopup = LinkPickerValue & {
  id: string;
  title: string;
  imageUrl: string;
  altText: string;
  isActive: boolean;
  /** Jours au format AAAA-MM-JJ (heure de Douala), vides si non renseignés. */
  startsOn: string;
  endsOn: string;
  /** Texte du statut : « Actif », « Programmé »… */
  state: { label: string; tone: "success" | "neutral" | "warning" };
  linkLabel: string;
};

/** Formulaire de création ou de modification, vérifié avec les mêmes règles que le serveur. */
function PopupForm({ popup, targets, onDone }: { popup?: ManagedPopup; targets: LinkPickerTargets; onDone: (message: string) => void }) {
  const [state, action] = useActionState(savePopup, null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (state?.ok) onDone(state.message);
  }, [state, onDone]);

  function check(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const text = (key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");
    const image = data.get("image");
    const parsed = popupFieldsSchema.safeParse({
      title: text("title"),
      altText: text("altText"),
      isActive: data.get("isActive") === "on",
      startsAt: text("startsAt"),
      endsAt: text("endsAt"),
      ...linkFields(data),
    });
    const message = !popup && (!(image instanceof File) || image.size === 0) ? "Choisissez l’image du popup." : parsed.success ? "" : parsed.error.issues[0]?.message;
    setError(message ?? "");
    if (message) event.preventDefault();
  }

  return (
    <form action={action} className="popup-form" onSubmit={check}>
      {popup && <input name="id" type="hidden" value={popup.id} />}
      <FramedImageInput currentUrl={popup?.imageUrl} frame={popupFrame} label="Choisir l’image du popup" name="image" onError={setError} required={!popup} />
      <div className="popup-form-fields">
        <label className="v-field">
          Nom du popup (pour vous seulement)
          <input defaultValue={popup?.title} maxLength={80} minLength={2} name="title" placeholder="Ex. : Soldes de Noël" required />
        </label>
        <LinkPicker initial={popup} targets={targets} />
        <label className="v-field">
          Description de l’image (facultatif)
          <input defaultValue={popup?.altText} maxLength={200} name="altText" placeholder="Ex. : -20 % sur toute la boutique jusqu’à dimanche" />
        </label>
        <div className="v-field-row">
          <label className="v-field">
            Début (facultatif)
            <input defaultValue={popup?.startsOn} name="startsAt" type="date" />
          </label>
          <label className="v-field">
            Fin (facultatif)
            <input defaultValue={popup?.endsOn} name="endsAt" type="date" />
          </label>
        </div>
        <label className="v-check">
          <input defaultChecked={popup ? popup.isActive : true} name="isActive" type="checkbox" />
          Activer ce popup (les autres popups seront désactivés)
        </label>
        {(error || (state && !state.ok)) && <p className="v-field-error" role="alert">{error || state?.message}</p>}
        <SubmitButton className="btn btn-primary" pendingLabel="Enregistrement…">{popup ? "Enregistrer" : "Créer le popup"}</SubmitButton>
      </div>
    </form>
  );
}

/** Aperçu du popup tel qu'il apparaîtra, sur téléphone et sur ordinateur. */
function PopupPreview({ popup }: { popup: ManagedPopup }) {
  const data = { id: popup.id, imageUrl: popup.imageUrl, altText: popup.altText, href: null };
  return (
    <div className="popup-preview">
      <figure>
        <div className="popup-preview-screen popup-preview-phone">
          <PopupCard popup={data} />
        </div>
        <figcaption>Sur téléphone</figcaption>
      </figure>
      <figure>
        <div className="popup-preview-screen popup-preview-desktop">
          <PopupCard popup={data} />
        </div>
        <figcaption>Sur ordinateur</figcaption>
      </figure>
    </div>
  );
}

export function PopupManager({ popups, targets, flash }: { popups: ManagedPopup[]; targets: LinkPickerTargets; flash: string | null }) {
  const [editing, setEditing] = useState<ManagedPopup | "new" | null>(null);
  const [previewing, setPreviewing] = useState<ManagedPopup | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="popup-manager">
      <div className="v-page-actions">
        <button className="btn btn-primary" onClick={() => setEditing("new")} type="button">Nouveau popup</button>
      </div>
      {(saved || flash) && <p className="v-banner v-banner-success" role="status">{saved ?? flash}</p>}

      {popups.length === 0 ? (
        <section className="v-card v-empty">
          <h2>Accueillez vos visiteurs avec une offre</h2>
          <p>Un popup s’affiche à l’ouverture de votre boutique, une fois par visite : idéal pour annoncer des soldes, une nouveauté ou la livraison gratuite.</p>
          <button className="btn btn-primary" onClick={() => setEditing("new")} type="button">Créer mon premier popup</button>
        </section>
      ) : (
        <ul className="popup-list">
          {popups.map((popup) => (
            <li className={`v-card popup-item${popup.isActive ? " is-active" : ""}`} key={popup.id}>
              <span className="popup-thumb">
                <StoreImage alt="" fill sizes="96px" src={popup.imageUrl} />
              </span>
              <span className="popup-info">
                <strong>{popup.title}</strong>
                <Badge tone={popup.state.tone}>{popup.state.label}</Badge>
                <small>Lien : {popup.linkLabel}</small>
                {(popup.startsOn || popup.endsOn) && (
                  <small>
                    {popup.startsOn ? `Du ${popup.startsOn.split("-").reverse().join("/")}` : "Dès maintenant"}
                    {popup.endsOn ? ` au ${popup.endsOn.split("-").reverse().join("/")}` : ", sans date de fin"}
                  </small>
                )}
              </span>
              <span className="icon-actions">
                <button aria-label={`Aperçu de « ${popup.title} »`} className="icon-button" onClick={() => setPreviewing(popup)} title="Aperçu" type="button">
                  <Eye aria-hidden="true" size={16} />
                </button>
                <button aria-label={`Modifier « ${popup.title} »`} className="icon-button" onClick={() => setEditing(popup)} title="Modifier" type="button">
                  <Pencil aria-hidden="true" size={16} />
                </button>
                <form action={togglePopup}>
                  <input name="id" type="hidden" value={popup.id} />
                  <input name="active" type="hidden" value={popup.isActive ? "0" : "1"} />
                  <button
                    aria-label={popup.isActive ? `Désactiver « ${popup.title} »` : `Activer « ${popup.title} »`}
                    className={`icon-button${popup.isActive ? " is-on" : ""}`}
                    title={popup.isActive ? "Désactiver" : "Activer (les autres seront désactivés)"}
                    type="submit"
                  >
                    {popup.isActive ? <Power aria-hidden="true" size={16} /> : <PowerOff aria-hidden="true" size={16} />}
                  </button>
                </form>
                <ActionDialog
                  action={deletePopup}
                  description="Le popup et son image seront supprimés définitivement."
                  hiddenFields={{ id: popup.id }}
                  submitClassName="btn btn-danger"
                  submitLabel="Supprimer"
                  title={`Supprimer « ${popup.title} » ?`}
                  triggerAriaLabel={`Supprimer « ${popup.title} »`}
                  triggerClassName="icon-button icon-button-danger"
                  triggerLabel={<Trash2 aria-hidden="true" size={16} />}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog onClose={() => setEditing(null)} open={editing !== null} size="lg" title={editing === "new" ? "Nouveau popup" : "Modifier le popup"}>
        {editing !== null && (
          <PopupForm
            key={editing === "new" ? "new" : editing.id}
            onDone={(message) => {
              setSaved(message);
              setEditing(null);
            }}
            popup={editing === "new" ? undefined : editing}
            targets={targets}
          />
        )}
      </Dialog>
      <Dialog
        description="Le popup apparaît environ 1 seconde après l’ouverture de la boutique, une fois par visite."
        onClose={() => setPreviewing(null)}
        open={previewing !== null}
        size="lg"
        title={previewing ? `Aperçu : ${previewing.title}` : "Aperçu"}
      >
        {previewing && <PopupPreview popup={previewing} />}
      </Dialog>
    </div>
  );
}

