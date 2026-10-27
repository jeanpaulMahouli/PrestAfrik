import type { Metadata } from "next";
import Link from "next/link";
import { BlogCover, formatPostDate } from "@/components/landing/blog-cover";
import { blogPosts, readingMinutes } from "@/components/landing/blog-posts";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: { absolute: "Blog · PrestAfrik" },
  alternates: { canonical: "/blog" },
  description: "Conseils concrets pour vendre plus en ligne : WhatsApp, livraison, paiement à la livraison et fidélisation de vos clients.",
};

export default async function BlogPage() {
  const signedIn = await isSignedIn();
  const [featured, ...others] = blogPosts;
  return (
    <PageShell
      hero={{
        title: "Des conseils concrets pour vendre plus",
        subtitle: "Ventes sur WhatsApp, livraison, fidélisation : des idées simples, testées sur le terrain, pour faire grandir votre commerce dès aujourd’hui.",
      }}
      signedIn={signedIn}
    >
      <section aria-label="Articles" className="lp-section">
        <Link className="lp-post lp-post--featured" href={`/blog/${featured.slug}`}>
          <BlogCover post={featured} priority />
          <div className="lp-post__body">
            <p className="lp-post__meta">
              <span className="lp-post__tag">{featured.category}</span> {formatPostDate(featured.date)} · {readingMinutes(featured)} min de lecture
            </p>
            <h2 className="lp-post__title">{featured.title}</h2>
            <p className="lp-post__excerpt">{featured.excerpt}</p>
            <span className="lp-post__more">
              Lire l’article
            </span>
          </div>
        </Link>

        <ul className="lp-posts">
          {others.map((post) => (
            <li key={post.slug}>
              <Link className="lp-post" href={`/blog/${post.slug}`}>
                <BlogCover post={post} />
                <div className="lp-post__body">
                  <p className="lp-post__meta">
                    <span className="lp-post__tag">{post.category}</span> {formatPostDate(post.date)} · {readingMinutes(post)} min
                  </p>
                  <h2 className="lp-post__title">{post.title}</h2>
                  <p className="lp-post__excerpt">{post.excerpt}</p>
                  <span className="lp-post__more">
                    Lire l’article
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
