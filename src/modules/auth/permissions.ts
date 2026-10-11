import { StoreRole } from "@prisma/client";

export type Permission =
  | "products.read"
  | "products.manage"
  | "orders.read"
  | "orders.prepare"
  | "orders.manage"
  | "orders.export"
  | "customers.read"
  | "customers.manage"
  | "payments.read"
  | "payments.manage"
  | "delivery.manage"
  | "marketing.manage"
  | "team.read"
  | "team.manage"
  | "store.manage"
  | "subscription.manage";

const rolePermissions: Record<StoreRole, ReadonlySet<Permission>> = {
  OWNER: new Set([
    "products.read",
    "products.manage",
    "orders.read",
    "orders.prepare",
    "orders.manage",
    "orders.export",
    "customers.read",
    "customers.manage",
    "payments.read",
    "payments.manage",
    "delivery.manage",
    "marketing.manage",
    "team.read",
    "team.manage",
    "store.manage",
    "subscription.manage",
  ]),
  MANAGER: new Set([
    "products.read",
    "products.manage",
    "orders.read",
    "orders.prepare",
    "orders.manage",
    "orders.export",
    "customers.read",
    "customers.manage",
    "payments.read",
    "payments.manage",
    "delivery.manage",
    "marketing.manage",
    "team.read",
    "store.manage",
  ]),
  ORDER_PREPARER: new Set([
    "products.read",
    "orders.read",
    "orders.prepare",
    "delivery.manage",
  ]),
};

export function hasPermission(role: StoreRole, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}

export type MembershipIdentity = {
  storeId: string;
  userId: string;
  role: StoreRole;
};

export function findAuthorizedMembership(
  memberships: readonly MembershipIdentity[],
  userId: string,
  requestedStoreId: string | undefined,
): MembershipIdentity | undefined {
  return memberships.find(
    (membership) =>
      membership.userId === userId &&
      (!requestedStoreId || membership.storeId === requestedStoreId),
  );
}
