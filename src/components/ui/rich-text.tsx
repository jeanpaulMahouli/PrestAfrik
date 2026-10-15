import { Fragment } from "react";
import { parseRichText, type InlineSegment } from "@/modules/catalog/rich-text";

function Inline({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.bold ? <strong key={index}>{segment.text}</strong> : segment.italic ? <em key={index}>{segment.text}</em> : <Fragment key={index}>{segment.text}</Fragment>,
      )}
    </>
  );
}

/** Affiche une description mise en forme (texte échappé par React, jamais de HTML injecté). */
export function RichText({ source, className = "rich-text" }: { source: string; className?: string }) {
  const blocks = parseRichText(source);
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "heading") return <h3 key={index}><Inline segments={block.segments} /></h3>;
        if (block.type === "bullets") return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><Inline segments={item} /></li>)}</ul>;
        if (block.type === "numbers") return <ol key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><Inline segments={item} /></li>)}</ol>;
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                <Inline segments={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
