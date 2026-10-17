"use client";

import { useId, useState } from "react";
import { faq } from "./content";
import { CaretIcon } from "./icons";
import { Reveal } from "./reveal";

/** Questions fréquentes : un seul tiroir ouvert à la fois, ouverture animée. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();

  return (
    <section aria-labelledby="faq-title" className="lp-section lp-faq" id="faq">
      <Reveal as="h2" className="lp-title lp-title--display" id="faq-title">
        {faq.title}
      </Reveal>

      <ul className="lp-faq__list">
        {faq.items.map((item, i) => {
          const isOpen = open === i;
          const panelId = `${baseId}-${i}`;
          return (
            <li className={`lp-faq__item${isOpen ? " is-open" : ""}`} key={item.question}>
              <button aria-controls={panelId} aria-expanded={isOpen} className="lp-faq__question" onClick={() => setOpen(isOpen ? null : i)} type="button">
                <span>{item.question}</span>
                <CaretIcon className="lp-faq__caret" />
              </button>
              <div className="lp-faq__answer" id={panelId} role="region">
                <p>{item.answer}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
