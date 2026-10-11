import { StoreTheme } from "@prisma/client";
import { AuthShell } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStore } from "@/modules/stores/actions";
import { cameroonCities, storeBusinessCategories, whatsappCountryCodes } from "@/modules/stores/options";

const themeLabels: Record<StoreTheme, { title: string; description: string }> = {
  CATALOGUE_EXPRESS: { title: "Catalogue express", description: "Simple et rapide" },
  MODE_BEAUTE: { title: "Mode et beauté", description: "Photos en grand" },
  BOUTIQUE_MARQUE: { title: "Boutique de marque", description: "Ton identité" },
};

export default async function NewStorePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <AuthShell
      heading="Créons ta boutique"
      message="Quelques informations pour préparer ton espace de vente."
    >
      <form action={createStore}>
        <label className="form-field">
          Nom de la boutique
          <input autoComplete="organization" maxLength={80} name="name" placeholder="Mboa Style" required />
        </label>
        <label className="form-field">
          Activité
          <select defaultValue="" name="businessCategory" required>
            <option disabled value="">Choisis une activité</option>
            {storeBusinessCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          Ville
          <select autoComplete="address-level2" defaultValue="" name="city" required>
            <option disabled value="">Choisis une ville</option>
            {cameroonCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>
        <fieldset className="form-field">
          <legend>WhatsApp de la boutique (facultatif)</legend>
          <div className="product-price-grid">
            <label className="form-field">
              Indicatif du pays
              <select autoComplete="tel-country-code" defaultValue="+237" name="countryCode">
                {whatsappCountryCodes.map(({ code, country }) => (
                  <option key={code} value={code}>{country} ({code})</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Numéro
              <input
                autoComplete="tel-national"
                inputMode="numeric"
                maxLength={20}
                name="phoneNumber"
                placeholder="6 00 00 00 00"
                type="tel"
              />
            </label>
          </div>
        </fieldset>
        <fieldset className="theme-selection">
          <legend className="theme-legend">
            Choisis un premier thème
          </legend>
          {(Object.entries(themeLabels) as [StoreTheme, (typeof themeLabels)[StoreTheme]][]).map(
            ([theme, details], index) => (
              <label
                className="surface-card theme-option"
                key={theme}
              >
                <input defaultChecked={index === 0} name="theme" type="radio" value={theme} />
                <span>
                  <strong>{details.title}</strong>
                  <br />
                  <span className="theme-description">{details.description}</span>
                </span>
              </label>
            ),
          )}
        </fieldset>
        {erreur && (
          <p aria-live="polite" className="form-error" role="alert">
            {erreur}
          </p>
        )}
        <SubmitButton className="primary-button full-width" pendingLabel="Création…">
          Créer ma boutique
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
