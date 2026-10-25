"use client";

import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState, useTransition, type FormEvent } from "react";
import { FramedImageInput } from "@/components/merchandising/framed-image-input";
import { LinkPicker, type LinkPickerTargets, type LinkPickerValue } from "@/components/merchandising/link-picker";
import { ActionDialog } from "@/components/ui/action-dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { addBanner, deleteBanner, reorderBanners, updateBanner, type BannerActionState } from "@/modules/merchandising/banner-actions";
import { bannerFieldsSchema, bannerFrame, bannerLimitMessage, linkFields, maxBanners } from "@/modules/merchandising/validation";

export type ManagedBanner = { id: string; imageUrl: string; altText: string } & LinkPickerValue;

/** Vérification avant l'envoi, avec les mêmes règles que le serveur. */
function validateBeforeSubmit(event: FormEvent<HTMLFormElement>, setError: (message: string) => void, requireImage: boolean) {
  const data = new FormData(event.currentTarget);
  const image = data.get("image");
  const fields = bannerFieldsSchema.safeParse({ altText: data.get("altText") ?? "", ...linkFields(data) });
  const message = requireImage && (!(image instanceof File) || image.size === 0) ? "Choisissez une image à ajouter." : fields.success ? "" : fields.error.issues[0]?.message;
  if (message) {
    event.preventDefault();
    setError(message);
  } else {
    setError("");
  }
}

function Feedback({ state, error }: { state: BannerActionState; error: string }) {
  if (error) return <p className="v-field-error" role="alert">{error}</p>;
  if (!state) return null;
  return (
    <p className={state.ok ? "v-banner v-banner-success" : "v-field-error"} role={state.ok ? "status" : "alert"}>
      {state.message}
    </p>
  );
}

function AddBannerForm({ targets }: { targets: LinkPickerTargets }) {
  const [state, action] = useActionState(addBanner, null);
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (state?.ok) setFormKey((key) => key + 1);
  }, [state]);

  return (
    <>
    <form action={action} className="banner-add" key={formKey} onSubmit={(event) => validateBeforeSubmit(event, setError, true)}>
      <FramedImageInput frame={bannerFrame} label="Ajouter une image" name="image" onError={setError} required />
      <div className="banner-fields">
        <LinkPicker targets={targets} />
        <label className="v-field">
          Description de l’image (facultatif)
          <input maxLength={200} name="altText" placeholder="Ex. : Nouvelle collection de pagnes wax" />
          <small className="v-muted">Lue par les personnes malvoyantes. Sans description, le nom de votre boutique est utilisé.</small>
        </label>
        <SubmitButton className="btn btn-primary" pendingLabel="Envoi de l’image…">Ajouter à la bannière</SubmitButton>
      </div>
    </form>
    <Feedback error={error} state={state} />
    </>
  );
}

function BannerCard({
  banner,
  index,
  count,
  targets,
  onMove,
  dragProps,
}: {
  banner: ManagedBanner;
  index: number;
  count: number;
  targets: LinkPickerTargets;
  onMove: (from: number, to: number) => void;
  dragProps: React.HTMLAttributes<HTMLLIElement> & { draggable: boolean };
}) {
  const [state, action] = useActionState(updateBanner, null);
  const [error, setError] = useState("");

  return (
    <li className="banner-card" {...dragProps}>
      <div className="banner-card-head">
        <span aria-hidden="true" className="banner-grip" title="Glissez pour changer l’ordre">
          <GripVertical size={18} />
        </span>
        <strong>Image {index + 1}</strong>
        <span className="icon-actions">
          <button aria-label={`Monter l’image ${index + 1}`} className="icon-button" disabled={index === 0} onClick={() => onMove(index, index - 1)} title="Monter" type="button">
            <ArrowUp size={16} />
          </button>
          <button aria-label={`Descendre l’image ${index + 1}`} className="icon-button" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} title="Descendre" type="button">
            <ArrowDown size={16} />
          </button>
          <ActionDialog
            action={deleteBanner}
            description="L’image disparaîtra de votre boutique. Cette action est définitive."
            hiddenFields={{ id: banner.id }}
            submitClassName="btn btn-danger"
            submitLabel="Supprimer l’image"
            title={`Supprimer l’image ${index + 1} ?`}
            triggerAriaLabel={`Supprimer l’image ${index + 1}`}
            triggerClassName="icon-button icon-button-danger"
            triggerLabel={<Trash2 aria-hidden="true" size={16} />}
          />
        </span>
      </div>
      <form action={action} className="banner-card-form" onSubmit={(event) => validateBeforeSubmit(event, setError, false)}>
        <input name="id" type="hidden" value={banner.id} />
        <FramedImageInput currentUrl={banner.imageUrl} frame={bannerFrame} label="Remplacer l’image" name="image" onError={setError} />
        <LinkPicker initial={banner} targets={targets} />
        <label className="v-field">
          Description de l’image
          <input defaultValue={banner.altText} maxLength={200} name="altText" />
        </label>
        <SubmitButton className="btn btn-secondary" pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
        <Feedback error={error} state={state} />
      </form>
    </li>
  );
}

/** Bannière de la boutique : jusqu'à 4 images, ordre modifiable par glisser-déposer ou avec les flèches. */
export function BannerManager({ banners, targets }: { banners: ManagedBanner[]; targets: LinkPickerTargets }) {
  const [order, setOrder] = useState(banners);
  const [dragged, setDragged] = useState<number | null>(null);
  const [message, setMessage] = useState<BannerActionState>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => setOrder(banners), [banners]);

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
    startTransition(async () => setMessage(await reorderBanners(next.map((banner) => banner.id))));
  }

  const full = order.length >= maxBanners;
  return (
    <div className="banner-manager">
      <p className="v-small v-muted" role="status">
        {order.length} image{order.length > 1 ? "s" : ""} sur {maxBanners}
        {order.length > 1 ? " · Glissez une image (ou utilisez les flèches) pour changer l’ordre du diaporama." : ""}
        {pending ? " · Enregistrement de l’ordre…" : ""}
      </p>
      {message && !message.ok && <p className="v-field-error" role="alert">{message.message}</p>}
      {order.length > 0 && (
        <ol className="banner-list">
          {order.map((banner, index) => (
            <BannerCard
              banner={banner}
              count={order.length}
              dragProps={{
                draggable: true,
                onDragStart: () => setDragged(index),
                onDragOver: (event) => event.preventDefault(),
                onDrop: (event) => {
                  event.preventDefault();
                  if (dragged !== null) move(dragged, index);
                  setDragged(null);
                },
                onDragEnd: () => setDragged(null),
                className: `banner-card${dragged === index ? " is-dragging" : ""}`,
              }}
              index={index}
              key={banner.id}
              onMove={move}
              targets={targets}
            />
          ))}
        </ol>
      )}
      <section aria-labelledby="banner-add-title" className="v-card">
        <h2 className="v-card-title" id="banner-add-title">Ajouter une image</h2>
        {full ? <p className="v-banner v-banner-info" role="status">{bannerLimitMessage}</p> : <AddBannerForm targets={targets} />}
      </section>
    </div>
  );
}
