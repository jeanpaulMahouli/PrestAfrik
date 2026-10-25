"use client";

/**
 * Réduit une photo dans le navigateur avant l'envoi (photos de téléphone de 4 à 10 Mo) : l'image garde
 * juste assez de pixels pour couvrir le format final, puis elle est recompressée en JPEG.
 * Le serveur la recadre et la convertit ensuite en WebP.
 */
export async function shrinkImageForUpload(file: File, frame: { width: number; height: number }, quality = 0.86): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // Illisible ici : le serveur renverra un message clair.
  }
  const scale = Math.min(1, Math.max(frame.width / bitmap.width, frame.height / bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob || (scale === 1 && blob.size >= file.size)) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
