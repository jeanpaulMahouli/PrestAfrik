import { hexColorSchema } from "@/modules/catalog/validation";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)
    ?.map((value) => parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3) return 0;
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function getAccessibleTextColor(background: string): "#000026" | "#FFFFFF" {
  const valid = hexColorSchema.parse(background);
  return luminance(valid) > 0.179 ? "#000026" : "#FFFFFF";
}
