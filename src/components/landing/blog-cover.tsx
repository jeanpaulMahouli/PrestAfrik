import Image from "next/image";
import type { BlogPost } from "./blog-posts";

/** Illustration d'un article : capture d'écran ou téléphone posé sur le dégradé de la marque. */
export function BlogCover({ post, priority = false, large = false }: { post: BlogPost; priority?: boolean; large?: boolean }) {
  return (
    <div className={`lp-blog-cover lp-blog-cover--${post.cover.kind}${large ? " lp-blog-cover--large" : ""}`}>
      <span aria-hidden="true" className="lp-blog-cover__ring" />
      <Image
        alt=""
        className="lp-blog-cover__image"
        height={post.cover.height}
        priority={priority}
        sizes={large ? "(max-width: 1023px) 92vw, 900px" : "(max-width: 767px) 92vw, 30vw"}
        src={post.cover.src}
        width={post.cover.width}
      />
    </div>
  );
}

export function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
