"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStoreBase, useStoreHref } from "@/components/storefront/store-links";
import { StoreImage } from "@/components/ui/store-image";
import { fillChatTemplate } from "@/modules/chat/config";
import { buildWaMeUrl } from "@/modules/whatsapp/wa-me";

export type ChatWidgetConfig = {
  welcomeMessage: string;
  transferTemplate: string;
  offHoursMessage: string | null;
  showOn: { home: boolean; product: boolean; cart: boolean; checkout: boolean };
  quickReplies: { label: string; answer: string }[];
  whatsappNumber: string;
};

type Message = { from: "bot" | "client"; text: string } | { from: "ready"; text: string; url: string };
type Stage = "menu" | "answered" | "transferred";

function pageKind(pathname: string, base: string): keyof ChatWidgetConfig["showOn"] | "other" {
  const rest = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  if (rest === "" || rest === "/") return "home";
  if (rest.startsWith("/panier")) return "cart";
  if (rest.startsWith("/commande")) return "checkout";
  if (rest.startsWith("/suivi") || rest.startsWith("/page/")) return "other";
  return "product";
}

const whatsappIcon = (size: number) => (
  <svg aria-hidden="true" fill="currentColor" height={size} viewBox="0 0 24 24" width={size}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);

/** Met en gras le nom de la boutique dans le message d'accueil (maquette). */
function withStoreName(text: string, storeName: string) {
  const index = text.indexOf(storeName);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <strong>{storeName}</strong>
      {text.slice(index + storeName.length)}
    </>
  );
}

/**
 * Assistant de la boutique (brief §6.15, maquette « Boutique : assistant WhatsApp ») : réponses
 * rédigées par le vendeur, sans IA. Pour toute autre question, un message prérempli s'ouvre dans
 * WhatsApp ; rien n'est envoyé sans le client.
 */
export function StoreChatWidget({ config, storeName, storeSlug, storeInitials, logoUrl }: { config: ChatWidgetConfig; storeName: string; storeSlug: string; storeInitials: string; logoUrl: string | null }) {
  const pathname = usePathname();
  const storeBase = useStoreBase(storeSlug);
  const link = useStoreHref(storeSlug);
  const router = useRouter();
  const kind = pageKind(pathname, storeBase);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<Stage>("menu");
  const [topic, setTopic] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, stage]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (kind === "other" || !config.showOn[kind]) return null;

  const home = link();
  const welcome = fillChatTemplate(config.welcomeMessage, { boutique: storeName });

  function say(label: string, answer: string) {
    setTopic(label);
    setStage("answered");
    setMessages((current) => [...current, { from: "client", text: label }, { from: "bot", text: answer }]);
  }

  function transfer(question: string, echo: string | null) {
    const productName = kind === "product" ? document.querySelector("main h1")?.textContent ?? "" : "";
    const text = fillChatTemplate(config.transferTemplate, {
      boutique: storeName,
      question: question || "j’ai une question",
      produit: productName,
      page: window.location.href,
    });
    setStage("transferred");
    setMessages((current) => [
      ...current,
      ...(echo ? [{ from: "client" as const, text: echo }] : []),
      { from: "bot" as const, text: "Avec plaisir ! Je prépare votre message pour le vendeur. Il suffira d’appuyer sur Envoyer dans WhatsApp." },
      { from: "ready" as const, text, url: buildWaMeUrl(config.whatsappNumber, text) },
    ]);
  }

  const menu = (
    <div className="sf-chat-chips">
      {kind !== "home" && (
        <button onClick={() => { close(); router.push(home); }} type="button">Voir les produits</button>
      )}
      {config.quickReplies.map((reply) => (
        <button key={reply.label} onClick={() => say(reply.label, reply.answer)} type="button">{reply.label}</button>
      ))}
      {kind !== "checkout" && (
        <button onClick={() => { close(); router.push(link("panier")); }} type="button">Passer commande</button>
      )}
      <button className="is-filled" onClick={() => transfer("", "Parler au vendeur")} type="button">Parler au vendeur</button>
    </div>
  );

  return (
    <>
      {!open && (
        <div className="sf-chat-launcher">
          <span aria-hidden="true" className="sf-chat-label">Une question ?</span>
          <button aria-haspopup="dialog" aria-label={`Une question ? Discuter avec ${storeName}`} className="sf-chat-trigger" onClick={() => setOpen(true)} ref={triggerRef} type="button">
            {whatsappIcon(28)}
          </button>
        </div>
      )}
      {open && (
        <>
          <div aria-hidden="true" className="sf-chat-backdrop" onClick={close} />
          <section aria-label={`Assistant de ${storeName}`} aria-modal="true" className="sf-chat" role="dialog">
            <header className="sf-chat-head">
              <span aria-hidden="true" className="sf-chat-avatar">
                {logoUrl ? <StoreImage alt="" height={80} src={logoUrl} width={80} /> : storeInitials}
              </span>
              <span className="sf-chat-title">
                <strong>{storeName}</strong>
                <small>Assistant de la boutique · réponses guidées</small>
              </span>
              <button aria-label="Fermer la discussion" className="sf-chat-close" onClick={close} ref={closeRef} type="button">✕</button>
            </header>

            <div aria-live="polite" className="sf-chat-messages" ref={listRef}>
              <p className="sf-bubble sf-bubble-bot">{withStoreName(welcome, storeName)}</p>
              {config.offHoursMessage && <p className="sf-bubble sf-bubble-bot">{config.offHoursMessage}</p>}
              {messages.length === 0 && menu}
              {messages.map((message, index) =>
                message.from === "ready" ? (
                  <div className="sf-chat-ready" key={index}>
                    <small>Votre message est prêt :</small>
                    <p>{message.text}</p>
                    <a className="sf-btn sf-btn-whatsapp sf-btn-block" href={message.url} rel="noopener noreferrer" target="_blank">
                      {whatsappIcon(20)}
                      Continuer sur WhatsApp
                    </a>
                    <small>En continuant, vous ouvrez WhatsApp. Aucun message n’est envoyé sans votre accord.</small>
                  </div>
                ) : (
                  <p className={`sf-bubble sf-bubble-${message.from}`} key={index}>{message.text}</p>
                ),
              )}
              {messages.length > 0 && stage === "answered" && (
                <div className="sf-chat-chips">
                  <button className="is-alt" onClick={() => { setStage("menu"); setTopic(null); }} type="button">Autre question</button>
                  <button className="is-filled" onClick={() => transfer(topic ? `j’ai une question sur : ${topic.toLowerCase()}` : "", "Parler au vendeur")} type="button">
                    Parler au vendeur
                  </button>
                </div>
              )}
              {messages.length > 0 && stage === "menu" && menu}
            </div>

            <form
              className="sf-chat-input"
              onSubmit={(event) => {
                event.preventDefault();
                const question = draft.trim();
                if (!question) return;
                setDraft("");
                transfer(question, question);
              }}
            >
              <label className="visually-hidden" htmlFor="sf-chat-question">Votre question</label>
              <input id="sf-chat-question" maxLength={300} onChange={(event) => setDraft(event.target.value)} placeholder="Écrire votre question…" value={draft} />
              <button aria-label="Préparer le message pour la boutique" type="submit">➤</button>
            </form>
          </section>
        </>
      )}
    </>
  );
}
