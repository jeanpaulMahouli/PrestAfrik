"use client";

import { Bell, Info, MailOpen, OctagonAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDismiss } from "@/components/ui/use-dismiss";

type Severity = "INFO" | "WARNING" | "CRITICAL";
type Item = { id: string; type: string; severity: Severity; message: string; occurrences: number; lastSeenAt: string; read: boolean };

const pollMs = 60_000;
const timeFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });

/** Icône de gravité (critique, attention, information), centrée dans une pastille. */
export function SeverityIcon({ severity }: { severity: Severity }) {
  const Icon = severity === "CRITICAL" ? OctagonAlert : severity === "WARNING" ? TriangleAlert : Info;
  const label = severity === "CRITICAL" ? "Critique" : severity === "WARNING" ? "Attention" : "Information";
  return (
    <span aria-label={label} className={`severity-icon severity-${severity.toLowerCase()}`} role="img" title={label}>
      <Icon aria-hidden="true" size={16} />
    </span>
  );
}

/** Cloche des notifications techniques (avant l'avatar) : badge des non lues, panneau déroulant. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { unread: number; items: Item[] };
      setUnread(data.unread);
      setItems(data.items);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // Rafraîchissement léger toutes les 60 secondes, seulement quand l'onglet est visible.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function mark(body: { all: true } | { id: string }) {
    const response = await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (response?.ok) {
      setUnread(((await response.json()) as { unread: number }).unread);
      setItems((current) => current?.map((item) => ("all" in body || item.id === body.id ? { ...item, read: true } : item)) ?? null);
    }
  }

  return (
    <div className="topbar-menu" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications techniques : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications techniques"}
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
        <div className="topbar-menu-panel bell-panel">
          {unread > 0 && (
            <div className="bell-head">
              <button aria-label="Tout marquer comme lu" className="icon-button icon-button-sm" onClick={() => void mark({ all: true })} title="Tout marquer comme lu" type="button">
                <MailOpen aria-hidden="true" size={16} />
              </button>
            </div>
          )}
          {failed && <p className="v-field-error">Impossible de charger les notifications. Nouvel essai dans une minute.</p>}
          {items === null && !failed && <p className="v-muted v-small">Chargement…</p>}
          {items?.length === 0 && <p className="v-muted v-small">Aucune notification : tout fonctionne normalement.</p>}
          {items && items.length > 0 && (
            <ul className="bell-list">
              {items.map((item) => (
                <li className={item.read ? "" : "is-unread"} key={item.id}>
                  <SeverityIcon severity={item.severity} />
                  <span className="bell-text">
                    <strong>{item.type}</strong>
                    <span>{item.message}</span>
                    <small>
                      {timeFormat.format(new Date(item.lastSeenAt))}
                      {item.occurrences > 1 ? ` · ${item.occurrences} fois` : ""}
                    </small>
                  </span>
                  {!item.read && (
                    <button aria-label="Marquer comme lu" className="icon-button icon-button-xs" onClick={() => void mark({ id: item.id })} title="Marquer comme lu" type="button">
                      <MailOpen aria-hidden="true" size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link className="topbar-menu-link" href="/admin/notifications" onClick={() => setOpen(false)}>
            Voir tout
          </Link>
        </div>
      )}
    </div>
  );
}
