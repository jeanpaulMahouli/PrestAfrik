import { describe, expect, it } from "vitest";
import { StoreRole } from "@prisma/client";
import { findAuthorizedMembership, hasPermission } from "../src/modules/auth/permissions";

describe("permissions de boutique", () => {
  it("isole les boutiques même si un identifiant de boutique est fourni", () => {
    const memberships = [
      { storeId: "store-a", userId: "user-a", role: StoreRole.OWNER },
      { storeId: "store-b", userId: "user-b", role: StoreRole.OWNER },
    ];

    expect(findAuthorizedMembership(memberships, "user-a", "store-a")).toMatchObject({
      storeId: "store-a",
      userId: "user-a",
    });
    expect(findAuthorizedMembership(memberships, "user-a", "store-b")).toBeUndefined();
  });

  it("retourne uniquement une boutique dont l’utilisateur est membre", () => {
    const memberships = [
      { storeId: "store-a", userId: "user-a", role: StoreRole.MANAGER },
      { storeId: "store-c", userId: "user-a", role: StoreRole.ORDER_PREPARER },
    ];

    expect(findAuthorizedMembership(memberships, "user-a", undefined)?.storeId).toBe("store-a");
    expect(findAuthorizedMembership(memberships, "user-a", "store-unknown")).toBeUndefined();
  });

  it("applique la matrice de rôles sans élargir les droits de préparation", () => {
    expect(hasPermission(StoreRole.OWNER, "team.manage")).toBe(true);
    expect(hasPermission(StoreRole.MANAGER, "team.manage")).toBe(false);
    expect(hasPermission(StoreRole.OWNER, "team.read")).toBe(true);
    expect(hasPermission(StoreRole.MANAGER, "team.read")).toBe(true);
    expect(hasPermission(StoreRole.ORDER_PREPARER, "team.read")).toBe(false);
    expect(hasPermission(StoreRole.ORDER_PREPARER, "orders.prepare")).toBe(true);
    expect(hasPermission(StoreRole.ORDER_PREPARER, "delivery.manage")).toBe(true);
    expect(hasPermission(StoreRole.ORDER_PREPARER, "payments.read")).toBe(false);
    expect(hasPermission(StoreRole.ORDER_PREPARER, "payments.manage")).toBe(false);
  });
});
