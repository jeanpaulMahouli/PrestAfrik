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

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.NODE_ENV === "development" ? localNetworkOrigins : [],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Photos are limited to 2 MB by the application; keep room for multipart overhead.
      bodySizeLimit: "3mb",
    },
  },
  async redirects() {
    // Les boutiques sont passées de prestafrik.com/boutique/{adresse} à prestafrik.com/{adresse} :
    // les liens déjà partagés (WhatsApp, QR codes imprimés…) continuent de fonctionner.
    return [
      { source: "/boutique/:slug", destination: "/:slug", permanent: true },
      { source: "/boutique/:slug/:path*", destination: "/:slug/:path*", permanent: true },
    ];
  },
  async rewrites() {
    // Older product images were stored under public/uploads; files that are not
    // part of the build are served by the /media route instead.
    return [{ source: "/uploads/:storeId/:filename", destination: "/media/:storeId/:filename" }];
  },
};

export default nextConfig;
