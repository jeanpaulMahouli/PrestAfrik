"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** Image de boutique qui affiche un repli neutre si le fichier est introuvable. */
export function StoreImage({ className, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span aria-label={alt || undefined} className={`image-fallback ${className ?? ""}`} role={alt ? "img" : undefined} />;
  }
  return <Image {...props} alt={alt} className={className} onError={() => setFailed(true)} />;
}
