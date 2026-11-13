"use client";

import { useState } from "react";
import type { ShopUniverse } from "@/config/marketplace";
import { pricePeriods, propertyTypes, type ListingMode, type PropertyDetails } from "@/modules/catalog/listing";

// Formulaire produit selon l'univers de la boutique : textes (produit, location, prestation, plat) et, pour
// les biens immobiliers, le bloc « Annonce » : location ou réservation (Immobilier), vente (Shopping).

export type ProductWording = {
  newTitle: string;
  newSubtitle: string;
  editSubtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  nameHelp: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  categoryPlaceholder: string;
  saveLabel: string;
  availability: [string, string, string];
  showStock: boolean;
  showVariants: boolean;
};

export const restaurationWording: ProductWording = {
  newTitle: "Ajouter un plat",
  newSubtitle: "Commencez par les photos du plat (jusqu’à 5), puis son nom et son prix. Vous pourrez tout modifier plus tard.",
  editSubtitle: "Modifiez ce plat. Vos clients verront les changements dès l’enregistrement.",
  nameLabel: "Nom du plat",
  namePlaceholder: "Ex. Poulet DG + plantains mûrs",
  nameHelp: "Le nom du plat tel qu’il figure sur votre menu.",
  descriptionLabel: "Description du plat (facultative)",
  descriptionPlaceholder: "Ingrédients, portion, accompagnement, piment…",
  categoryPlaceholder: "Choisir ou créer une catégorie (ex. Plats, Boissons, Desserts)",
  saveLabel: "Enregistrer le plat",
  availability: ["Disponible", "Épuisé aujourd’hui", "Sur commande"],
  showStock: false,
  showVariants: true,
};

export const productWording: Record<ShopUniverse, ProductWording> = {
  vente: {
    newTitle: "Ajouter un produit",
    newSubtitle: "Commencez par les photos de votre produit (jusqu’à 5), puis complétez les informations. Vous pourrez tout modifier plus tard.",
    editSubtitle: "Modifiez les informations de ce produit. Vos clients verront les changements dès l’enregistrement.",
    nameLabel: "Nom du produit",
    namePlaceholder: "Ex. Robe wax Akwa",
    nameHelp: "Court et précis : type de produit, couleur, matière ou marque.",
    descriptionLabel: "Description (facultative)",
    descriptionPlaceholder: "Décrivez votre produit en quelques mots",
    categoryPlaceholder: "Choisir ou créer une catégorie",
    saveLabel: "Enregistrer le produit",
    availability: ["Disponible", "Épuisé", "Sur commande"],
    showStock: true,
    showVariants: true,
  },
  immobilier: {
    newTitle: "Ajouter une location",
    newSubtitle: "Commencez par les photos du bien (jusqu’à 5), puis indiquez s’il se loue au mois ou se réserve à la nuit. Vous pourrez tout modifier plus tard.",
    editSubtitle: "Modifiez cette annonce. Les visiteurs verront les changements dès l’enregistrement.",
    nameLabel: "Titre de l’annonce",
    namePlaceholder: "Ex. Studio meublé, Bonamoussadi",
    nameHelp: "Type de bien, nombre de chambres et quartier : c’est ce que les visiteurs cherchent.",
    descriptionLabel: "Description du bien (facultative)",
    descriptionPlaceholder: "Pièces, état, accès, eau et électricité, conditions (caution, avance)…",
    categoryPlaceholder: "Choisir ou créer une catégorie (ex. Studios, Appartements, Bureaux)",
    saveLabel: "Enregistrer l’annonce",
    availability: ["Disponible", "Déjà loué ou réservé", "Sur demande"],
    showStock: false,
    showVariants: false,
  },
  services: {
    newTitle: "Ajouter une prestation",
    newSubtitle: "Commencez par des photos de votre travail (jusqu’à 5), puis décrivez la prestation et son prix de départ. Vous pourrez tout modifier plus tard.",
    editSubtitle: "Modifiez cette prestation. Vos clients verront les changements dès l’enregistrement.",
    nameLabel: "Nom de la prestation",
    namePlaceholder: "Ex. Tresses africaines (longueur épaules)",
    nameHelp: "Ce que vous faites, en quelques mots : vos clients le comprennent tout de suite.",
    descriptionLabel: "Description de la prestation (facultative)",
    descriptionPlaceholder: "Ce qui est compris, la durée, où vous intervenez…",
    categoryPlaceholder: "Choisir ou créer une catégorie (ex. Coiffure, Réparation)",
    saveLabel: "Enregistrer la prestation",
    availability: ["Disponible", "Indisponible pour le moment", "Sur rendez-vous"],
    showStock: false,
    showVariants: true,
  },
  restauration: restaurationWording,
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
  /** « rent » : location ou réservation (univers Immobilier) ; « sale » : vente (Shopping). */
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
      ) : (
        <p className="v-small v-muted">Terrain, maison, appartement à vendre : indiquez ses caractéristiques, elles s’affichent sur la fiche.</p>
      )}

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
