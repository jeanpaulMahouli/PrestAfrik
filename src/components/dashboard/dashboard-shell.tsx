import { VendorShell } from "@/components/layout/vendor-shell";

/**
 * Ancienne signature conservée pour les pages existantes : le shell relit lui-même le contexte
 * vendeur (mémoïsé), les propriétés transmises sont donc ignorées.
 */
export function DashboardShell({ children }: { children: React.ReactNode } & Record<string, unknown>) {
  return <VendorShell>{children}</VendorShell>;
}
