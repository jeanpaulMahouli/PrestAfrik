import { ArrowLeft, Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogCover, formatPostDate } from "@/components/landing/blog-cover";
import { blogPosts, findBlogPost, readingMinutes, type BlogBlock } from "@/components/landing/blog-posts";
import { LandingButton } from "@/components/landing/buttons";
import { isSignedIn, PageShell } from "@/components/landing/page-shell";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ article: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/blog/[article]">): Promise<Metadata> {
  const post = findBlogPost((await params).article);
  if (!post) return {};
  return {
    title: { absolute: `${post.title} · Blog PrestAfrik` },
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.date, images: [post.cover.src] },
  };
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return <h2>{block.text}</h2>;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </List>
      );
    }
    case "quote":
      return (
        <blockquote>
          <p>{block.text}</p>
          {block.author && <cite>{block.author}</cite>}
        </blockquote>
      );
    case "tip":
      return (
        <aside className="lp-article__tip">
          <Lightbulb aria-hidden="true" size={22} />
          <div>
            <strong>{block.title}</strong>
            <p>{block.text}</p>
          </div>
        </aside>
      );
    default:
      return <p>{block.text}</p>;
  }
}

export default async function BlogArticlePage({ params }: PageProps<"/blog/[article]">) {
  const post = findBlogPost((await params).article);
  if (!post) notFound();
  const signedIn = await isSignedIn();
  const others = blogPosts.filter((item) => item.slug !== post.slug);

  return (
    <PageShell
      hero={{
        title: post.title,
        subtitle: `${formatPostDate(post.date)} · ${readingMinutes(post)} min de lecture · ${post.author}`,
      }}
      signedIn={signedIn}
    >
      <article className="lp-article">
        <BlogCover large post={post} priority />
        <p className="lp-article__lead">{post.excerpt}</p>
        <div className="lp-article__content">
          {post.blocks.map((block, i) => (
            <Block block={block} key={i} />
          ))}
        </div>
        <aside className="lp-article__cta">
          <h2>Passez à l’action dès aujourd’hui</h2>
          <p>Votre boutique PrestAfrik est gratuite et prête en 5 minutes. Vos prochains clients vous attendent.</p>
          <LandingButton href={signedIn ? "/dashboard" : "/inscription"}>{signedIn ? "Aller à mon espace" : "Créer ma boutique gratuitement"}</LandingButton>
        </aside>
        <nav aria-label="Autres articles" className="lp-article__more">
          <Link className="lp-article__back" href="/blog">
            <ArrowLeft aria-hidden="true" size={18} /> Tous les articles
          </Link>
          <ul>
            {others.map((item) => (
              <li key={item.slug}>
                <Link href={`/blog/${item.slug}`}>
                  <span className="lp-post__tag">{item.category}</span>
                  <strong>{item.title}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </PageShell>
  );
}
