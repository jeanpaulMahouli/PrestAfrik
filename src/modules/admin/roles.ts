/** Libellés des rôles d'administration (affichage et e-mail E26). */
export const adminRoleLabels: Record<"ADMIN" | "SUPER_ADMIN", string> = { ADMIN: "Administrateur", SUPER_ADMIN: "Super administrateur" };

export const adminRoleDescriptions: Record<"ADMIN" | "SUPER_ADMIN", string> = {
  ADMIN: "Vous pouvez superviser les boutiques, les utilisateurs, les alertes et les demandes d’aide.",
  SUPER_ADMIN: "Vous pouvez superviser toute la plateforme et donner ou retirer les droits d’administration.",
};
