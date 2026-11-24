"use client";

import { Bell, Lightbulb, MailOpen, MessageCircle, ShoppingBag, Sparkles, TriangleAlert } from "@/components/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDismiss } from "@/components/ui/use-dismiss";

type Kind = "ORDER" | "MESSAGE" | "NEWS" | "TIP" | "ALERT";
export type BellItem = { id: string; kind: Kind; title: string; body: string; url: string | null; readAt: string | null; createdAt: string };

const pollMs = 60_000;
const icons = { ORDER: ShoppingBag, MESSAGE: MessageCircle, NEWS: Sparkles, TIP: Lightbulb, ALERT: TriangleAlert } as const;

/** « il y a 5 min », « hier »… */
export function timeAgo(value: string | Date) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Pastille d'icône d'une notification, colorée selon son type. */
export function NotificationIcon({ kind }: { kind: Kind }) {
  const Icon = icons[kind];
  return (
    <span aria-hidden="true" className={`vnotif-icon vnotif-icon--${kind.toLowerCase()}`}>
      <Icon size={16} />
    </span>
  );
}

/**
 * Cloche de l'espace vendeur : commandes, réponses de l'équipe, nouveautés, astuces. Compteur des non lues,
 * rafraîchi toutes les minutes quand l'onglet est visible ; un clic ouvre la page concernée et marque lu.
 */
export function VendorBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<BellItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { unread: number; items: BellItem[] };
      setUnread(data.unread);
      setItems(data.items);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function mark(body: { all: true } | { id: string }) {
    const response = await fetch("/api/dashboard/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (response?.ok) {
      setUnread(((await response.json()) as { unread: number }).unread);
      setItems((current) => current?.map((item) => ("all" in body || item.id === body.id ? { ...item, readAt: new Date().toISOString() } : item)) ?? null);
    }
  }

  function openItem(item: BellItem) {
    if (!item.readAt) void mark({ id: item.id });
    setOpen(false);
    if (item.url) router.push(item.url);
  }

  return (
    <div className="topbar-menu" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
        className="bell-button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void refresh();
        }}
        type="button"
      >
        <Bell aria-hidden="true" size={20} />
        {unread > 0 && <span className="bell-count">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="topbar-menu-panel bell-panel vnotif-panel">
          <div className="vnotif-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="v-link-button" onClick={() => void mark({ all: true })} type="button">
                <MailOpen aria-hidden="true" size={14} /> Tout marquer lu
              </button>
            )}
          </div>
          {failed && <p className="v-field-error">Chargement impossible. Nouvel essai dans une minute.</p>}
          {items === null && !failed && <p className="v-muted v-small vnotif-empty">Chargement…</p>}
          {items?.length === 0 && <p className="v-muted v-small vnotif-empty">Rien de nouveau pour le moment.</p>}
          {items && items.length > 0 && (
            <ul className="vnotif-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button className={`vnotif-item${item.readAt ? "" : " is-unread"}`} onClick={() => openItem(item)} type="button">
                    <NotificationIcon kind={item.kind} />
                    <span className="vnotif-text">
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                      <small>{timeAgo(item.createdAt)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="vnotif-foot">
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)}>
              Tout voir
            </Link>
            <Link href="/dashboard/discussions" onClick={() => setOpen(false)}>
              Mes messages
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
