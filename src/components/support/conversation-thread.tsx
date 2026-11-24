import { formatDateTime } from "@/lib/format";
import type { ConversationMessage } from "@/modules/support/conversation";

/**
 * Fil d'une conversation en bulles : la personne qui lit à droite (« moi »), l'autre à gauche.
 * `viewer` : « team » dans l'administration, « vendor » dans l'espace vendeur.
 */
export function ConversationThread({ messages, viewer }: { messages: ConversationMessage[]; viewer: "team" | "vendor" }) {
  return (
    <ol className="conv-thread">
      {messages.map((message) => {
        const mine = viewer === "team" ? message.fromTeam : !message.fromTeam;
        return (
          <li className={`conv-bubble${mine ? " is-mine" : ""}`} key={message.id}>
            <small className="conv-meta">
              {mine ? "Vous" : message.author} · {formatDateTime(message.at)}
            </small>
            <p>{message.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
