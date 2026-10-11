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
};

export default nextConfig;
