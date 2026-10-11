import { updateTag } from "next/cache";
import { storefrontTag } from "@/modules/catalog/service";

export function invalidateStorefrontCache(storeId: string, storeSlug: string) {
  updateTag(storefrontTag(storeId));
  updateTag(storefrontTag(storeSlug));
}
