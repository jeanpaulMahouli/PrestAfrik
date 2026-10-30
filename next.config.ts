import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  return (
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
    (octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168))
  );
}

const localNetworkOrigins = Object.values(networkInterfaces()).flatMap((interfaces) =>
  (interfaces ?? [])
    .filter(
      (address) =>
        address.family === "IPv4" && !address.internal && isPrivateIpv4(address.address),
    )
    .map((address) => address.address),
);

// Boutiques en sous-domaine (ADR-024) : les scripts, styles et polices du build sont chargés depuis le
// domaine principal. Ils ne passent pas par le Worker Cloudflare des sous-domaines, dont le quota gratuit
// est compté en requêtes. Fixé au build : FEATURE_SUBDOMAINS et BETTER_AUTH_URL doivent y être définis.
const subdomainAssetOrigin =
  process.env.NODE_ENV === "production" && process.env.FEATURE_SUBDOMAINS === "true" && process.env.BETTER_AUTH_URL?.startsWith("https://")
    ? process.env.BETTER_AUTH_URL.replace(/\/$/, "")
    : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.NODE_ENV === "development" ? localNetworkOrigins : [],
  assetPrefix: subdomainAssetOrigin,
  poweredByHeader: false,
  experimental: {
    // Processus du build limités : sur un serveur qui annonce beaucoup de processeurs (64 chez l'hébergeur),
    // Next.js en lançait 63, chacun chargeant le moteur Prisma et ses threads, jusqu'à épuiser la limite de
    // threads du conteneur (« OS can't spawn worker thread »). Réglable avec NEXT_BUILD_WORKERS.
    cpus: Math.max(1, Number(process.env.NEXT_BUILD_WORKERS) || 2),
    serverActions: {
      // Boutiques en sous-domaine : le formulaire de commande est envoyé depuis mboa-style.prestafrik.com
      // alors que la requête arrive avec l'hôte prestafrik.com (Cloudflare réécrit l'en-tête Host).
      allowedOrigins: process.env.STORE_ROOT_DOMAIN ? [`*.${process.env.STORE_ROOT_DOMAIN}`] : [],
      // Photos are limited to 2 MB by the application; keep room for multipart overhead.
      bodySizeLimit: "3mb",
    },
  },
  async headers() {
    // Polices et scripts lus depuis {boutique}.prestafrik.com : le navigateur exige ce droit pour les polices.
    return subdomainAssetOrigin
      ? [{ source: "/_next/static/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] }]
      : [];
  },
  async redirects() {
    // Les boutiques sont passées de prestafrik.com/boutique/{adresse} à prestafrik.com/{adresse} :
    // les liens déjà partagés (WhatsApp, QR codes imprimés…) continuent de fonctionner.
    return [
      { source: "/boutique/:slug", destination: "/:slug", permanent: true },
      { source: "/boutique/:slug/:path*", destination: "/:slug/:path*", permanent: true },
      // La bannière est passée de « Ma boutique » à « Marketing ».
      { source: "/dashboard/boutique/banniere", destination: "/dashboard/marketing/banniere", permanent: true },
    ];
  },
  async rewrites() {
    // Older product images were stored under public/uploads; files that are not
    // part of the build are served by the /media route instead.
    return [{ source: "/uploads/:storeId/:filename", destination: "/media/:storeId/:filename" }];
  },
};

export default nextConfig;
