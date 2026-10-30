import Image from "next/image";
import type { ReactNode } from "react";

// Démonstrations animées (effet « GIF », en CSS) : les écrans réels se succèdent en fondu dans un téléphone
// ou un navigateur. Aucune vidéo à télécharger ; tout s'arrête si l'utilisateur réduit les animations.

type Screen = { src: string; width: number; height: number; alt: string };

/** Téléphone dont l'écran fait défiler les captures (4 au plus). */
export function AnimatedPhone({ screens, children }: { screens: Screen[]; children?: ReactNode }) {
  return (
    <div className={`lp-demo-phone lp-demo--${screens.length}`}>
      <span aria-hidden="true" className="lp-demo-phone__island" />
      <div className="lp-demo-phone__screen">
        {screens.map((screen, index) => (
          <Image
            alt={index === 0 ? screen.alt : ""}
            className="lp-demo-frame"
            height={screen.height}
            key={screen.src}
            sizes="(max-width: 767px) 62vw, 300px"
            src={screen.src}
            style={{ animationDelay: `${index * 3}s` }}
            width={screen.width}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

/** Fenêtre de navigateur dont la page fait défiler les captures du tableau de bord (4 au plus). */
export function AnimatedBrowser({ screens, children }: { screens: Screen[]; children?: ReactNode }) {
  return (
    <div className={`lp-demo-browser lp-demo--${screens.length}`}>
      <span aria-hidden="true" className="lp-browser__bar">
        <i />
        <i />
        <i />
      </span>
      <div className="lp-demo-browser__screen">
        {screens.map((screen, index) => (
          <Image
            alt={index === 0 ? screen.alt : ""}
            className="lp-demo-frame"
            height={screen.height}
            key={screen.src}
            sizes="(max-width: 1023px) 92vw, 640px"
            src={screen.src}
            style={{ animationDelay: `${index * 3}s` }}
            width={screen.width}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

/** Notification qui apparaît par-dessus une démonstration (« Nouvelle commande… »). */
export function DemoToast({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div aria-hidden="true" className="lp-demo-toast">
      <span className="lp-demo-toast__icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  );
}
