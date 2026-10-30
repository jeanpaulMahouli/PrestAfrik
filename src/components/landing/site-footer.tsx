import Image from "next/image";
import Link from "next/link";
import { footer } from "./content";

function FooterLink({ href, label }: { href: string; label: string }) {
  return href.startsWith("/") ? <Link href={href}>{label}</Link> : <a href={href}>{label}</a>;
}

export function SiteFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__brand">
        <Image alt="PrestAfrik" height={65} src="/brand/logo-prestafrik.png" width={118} />
        <p className="lp-footer__tagline">{footer.tagline}</p>
      </div>

      {footer.columns.map((column) => (
        <nav aria-label={column.title} className="lp-footer__col" key={column.title}>
          <h2>{column.title}</h2>
          <ul>
            {column.links.map((link) => (
              <li key={link.label}>
                <FooterLink {...link} />
              </li>
            ))}
          </ul>
        </nav>
      ))}

      <div className="lp-footer__col">
        <h2>{footer.socialTitle}</h2>
        <ul className="lp-footer__socials">
          {footer.socials.map((social) => (
            <li key={social.label}>
              <a aria-label={`${social.label} (nouvel onglet)`} href={social.href} rel="noopener noreferrer" target="_blank" title={social.label}>
                <Image alt="" height={26} src={social.icon} width={26} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="lp-footer__copyright">
        {footer.copyright}
        <br />
        Conçu avec <Image alt="amour" className="lp-footer__heart" height={20} src="/landing/emoji/coeur.webp" width={20} /> par{" "}
        <a className="lp-footer__credit" href={footer.madeByHref} rel="noopener" target="_blank">
          {footer.madeBy}
        </a>
        .
      </p>
    </footer>
  );
}
