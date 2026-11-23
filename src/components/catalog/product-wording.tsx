"use client";

import { useState } from "react";
import { pricePeriods, propertyTypes, type ListingMode, type PropertyDetails } from "@/modules/catalog/listing";

// Formulaire produit : textes et, pour les biens immobiliers, le bloc « Annonce » (location ou vente).

export type ProductWording = {
  newTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  categoryPlaceholder: string;
  saveLabel: string;
  availability: [string, string, string];
  showStock: boolean;
  showVariants: boolean;
};

export const productWording: ProductWording = {
  newTitle: "Ajouter un produit",
  nameLabel: "Nom du produit",
  namePlaceholder: "Ex. Robe wax Akwa",
  descriptionLabel: "Description (facultative)",
  descriptionPlaceholder: "Décrivez votre produit en quelques mots",
  categoryPlaceholder: "Choisir ou créer une catégorie",
  saveLabel: "Enregistrer le produit",
  availability: ["Disponible", "Épuisé", "Sur commande"],
  showStock: true,
  showVariants: true,
};

export type ListingValues = { listingType: "SALE" | "RENT" | ""; pricePeriod: "DAY" | "MONTH" | "YEAR" | ""; details: PropertyDetails | null };

/** Bloc « Annonce » des biens immobiliers. Les champs sont rattachés au formulaire produit par leur attribut form. */
export function ListingFields({
  formId,
  values,
  errors,
  mode,
}: {
  formId: string;
  values: ListingValues;
  errors: Record<string, string>;
  /** « rent » : location ou réservation ; « sale » : vente. */
  mode: ListingMode;
}) {
  const [period, setPeriod] = useState(values.pricePeriod || "MONTH");
  const details = values.details;
  const error = (key: string) => (errors[key] ? <span className="v-field-error" role="alert">{errors[key]}</span> : null);

  return (
    <section aria-labelledby="listing-title" className="v-card" id="product-listing">
      <h2 className="v-card-title" id="listing-title">{mode === "rent" ? "Location ou réservation" : "Bien à vendre"}</h2>
      {mode === "rent" ? (
        <fieldset className="listing-type">
          <legend className="listing-type-legend">Ce bien se propose en</legend>
          <div className="listing-type-options listing-type-options-3">
            {pricePeriods.map((option) => (
              <label className={`listing-type-option${period === option.value ? " is-selected" : ""}`} key={option.value}>
                <input checked={period === option.value} form={formId} name="pricePeriod" onChange={() => setPeriod(option.value)} type="radio" value={option.value} />
                {option.label}
              </label>
            ))}
          </div>
          {error("pricePeriod")}
        </fieldset>
      ) : null}

      <div className="v-grid-2">
        <label className="v-field">
          Type de bien
          <select defaultValue={details?.propertyType ?? ""} form={formId} name="propertyType">
            <option disabled value="">Choisir le type de bien</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {error("propertyType")}
        </label>
        <label className="v-field">
          Quartier (facultatif)
          <input defaultValue={details?.neighborhood ?? ""} form={formId} maxLength={120} name="neighborhood" placeholder="Ex. Bonamoussadi, Douala" />
          {error("neighborhood")}
        </label>
        <label className="v-field">
          Surface en m² (facultatif)
          <input defaultValue={details?.surfaceM2 ?? ""} form={formId} inputMode="numeric" name="surfaceM2" placeholder="Ex. 85" />
          {error("surfaceM2")}
        </label>
        <label className="v-field">
          Chambres (facultatif)
          <input defaultValue={details?.bedrooms ?? ""} form={formId} inputMode="numeric" name="bedrooms" placeholder="Ex. 2" />
          {error("bedrooms")}
        </label>
        <label className="v-field">
          Salles de bain (facultatif)
          <input defaultValue={details?.bathrooms ?? ""} form={formId} inputMode="numeric" name="bathrooms" placeholder="Ex. 1" />
          {error("bathrooms")}
        </label>
        <label className="v-check listing-furnished">
          <input defaultChecked={details?.furnished ?? false} form={formId} name="furnished" type="checkbox" />
          Bien meublé
        </label>
      </div>
    </section>
  );
}
