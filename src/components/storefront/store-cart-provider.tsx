"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";

export type CartLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartLine[];
  ready: boolean;
  error: string;
  add: (line: CartLine) => boolean;
  changeQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  clear: () => void;
};

const storageKey = "prestafrik-panier-v1";
const cartSchema = z.array(
  z.object({
    productId: z.string().cuid(),
    variantId: z.string().cuid().nullable(),
    quantity: z.number().int().positive().max(25),
  }),
).max(30);

const CartContext = createContext<CartContextValue | null>(null);

export function StoreCartProvider({
  children,
  storeId,
}: {
  children: ReactNode;
  storeId: string;
}) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const itemsRef = useRef<CartLine[]>([]);
  const key = `${storageKey}:${storeId}`;
  const ready = loadedKey === key;

  useEffect(() => {
    itemsRef.current = [];
    setItems([]);
    setLoadedKey(null);
    setError("");
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = cartSchema.safeParse(JSON.parse(stored) as unknown);
        if (parsed.success) {
          itemsRef.current = parsed.data;
          setItems(parsed.data);
        } else {
          localStorage.removeItem(key);
          setError("Un ancien panier invalide a été réinitialisé. Ajoute à nouveau tes produits.");
        }
      }
    } catch {
      setError("Le panier n’a pas pu être enregistré sur cet appareil.");
    } finally {
      setLoadedKey(key);
    }
  }, [key]);

  const updateItems = useCallback((nextItems: CartLine[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
    setError("");
    try {
      if (nextItems.length) localStorage.setItem(key, JSON.stringify(nextItems));
      else localStorage.removeItem(key);
      return true;
    } catch {
      setError("Le panier n’a pas pu être enregistré sur cet appareil.");
      return false;
    }
  }, [key]);

  const changeQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      updateItems(
        itemsRef.current.flatMap((item) => {
          if (item.productId !== productId || item.variantId !== variantId) return [item];
          return quantity <= 0 ? [] : [{ ...item, quantity: Math.min(25, quantity) }];
        }),
      );
    },
    [updateItems],
  );

  const add = useCallback((line: CartLine) => {
    if (!ready) return false;
    const current = itemsRef.current;
    const index = current.findIndex(
      (item) => item.productId === line.productId && item.variantId === line.variantId,
    );
    if (index === -1) {
      if (current.length >= 30) {
        setError("Ton panier contient déjà 30 produits différents.");
        return false;
      }
      return updateItems([...current, { ...line, quantity: Math.max(1, Math.min(25, line.quantity)) }]);
    }
    return updateItems(current.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, quantity: Math.min(25, item.quantity + line.quantity) }
        : item,
    ));
  }, [ready, updateItems]);

  const remove = useCallback((productId: string, variantId: string | null) => {
    updateItems(
      itemsRef.current.filter((item) => item.productId !== productId || item.variantId !== variantId),
    );
  }, [updateItems]);

  const clear = useCallback(() => updateItems([]), [updateItems]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      error,
      add,
      changeQuantity,
      remove,
      clear,
    }),
    [add, changeQuantity, clear, error, items, ready, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useStoreCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("Le panier doit être utilisé dans une boutique.");
  return context;
}
