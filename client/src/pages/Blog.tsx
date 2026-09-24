import { ArrowLeft, ArrowUpRight, Clock3, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { articles, type Article, type ArticleBlock } from "./blogArticles";

function setArticleMetadata(article: Article | null) {
  const title = article ? `${article.title} | Droply` : "Droply Blog — Practical Guides to Private File Sharing";
  const description = article?.description ?? "Practical guides to sharing files, photos, videos, text, and links privately between devices without signup.";
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('meta[name="robots"]')?.setAttribute("content", "index,follow,max-image-preview:large");
  const schemaId = "droply-blog-schema";
  document.getElementById(schemaId)?.remove();
  const url = `${window.location.origin}${article ? `/blog/${article.slug}` : "/blog"}`;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
  const graph: Record<string, unknown>[] = [{ "@type": "WebPage", "@id": url, url, name: title, description, isPartOf: { "@type": "WebSite", name: "Droply", url: window.location.origin } }];
  if (article) graph.push({ "@type": "Article", headline: article.title, description, datePublished: article.published, dateModified: article.published, author: { "@type": "Organization", name: "Droply" }, publisher: { "@type": "Organization", name: "Droply" }, mainEntityOfPage: url, keywords: article.keywords.join(", ") });
  else graph.push({ "@type": "CollectionPage", name: title, mainEntity: articles.map(item => `${window.location.origin}/blog/${item.slug}`) });
  const script = document.createElement("script");
  script.id = schemaId;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph } );
  document.head.appendChild(script);
}

/** "2026-09-02" -> "September 2, 2026" */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Renders **bold**, *italic* and [text](url) inline markup. */
function Inline({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[1];
    if (tok.startsWith("**")) nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*")) nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    else {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      if (lm) nodes.push(<a key={key++} href={lm[2]}>{lm[1]}</a>);
      else nodes.push(tok);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.kind) {
    case "p":
      return <p><Inline text={block.text} /></p>;
    case "quote":
      return <blockquote><p><Inline text={block.text} /></p></blockquote>;
    case "list": {
      const items = block.items.map((item, i) => <li key={i}><Inline text={item} /></li>);
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case "table":
      return (
        <div className="article-table-wrap">
          <table>
            <thead>
              <tr>{block.head.map((h, i) => <th key={i}><Inline text={h} /></th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>{row.map((c, j) => <td key={j}><Inline text={c} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "faq":
      return (
        <div className="article-faq">
          {block.items.map((item, i) => (
            <div className="article-faq-item" key={i}>
              <p className="article-faq-q"><Inline text={item.q} /></p>
              {item.a.map((para, j) => <p key={j}><Inline text={para} /></p>)}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

const RELATED: Record<string, { label: string; href: string }[]> = {
  "transfer-large-video-iphone-to-android-without-app": [
    { label: "How to Share Files Between Two Phones Without Installing an App", href: "/blog/share-files-between-two-phones-without-an-app" },
    { label: "How to Send Large Files from Phone to Phone with a 4-Digit Code", href: "/blog/send-large-files-phone-to-phone-4-digit-code" },
  ],
  "share-files-between-two-phones-without-an-app": [
    { label: "How to Transfer Large Videos from iPhone to Android Without an App", href: "/blog/transfer-large-video-iphone-to-android-without-app" },
    { label: "How to Send Large Files from Phone to Phone with a 4-Digit Code", href: "/blog/send-large-files-phone-to-phone-4-digit-code" },
  ],
  "secure-temporary-file-sharing-without-signup": [
    { label: "Security", href: "/security" },
    { label: "Privacy", href: "/privacy" },
    { label: "How to Send Large Files from Phone to Phone with a 4-Digit Code", href: "/blog/send-large-files-phone-to-phone-4-digit-code" },
  ],
  "send-large-files-phone-to-phone-4-digit-code": [
    { label: "How to Share Files Between Two Phones Without Installing an App", href: "/blog/share-files-between-two-phones-without-an-app" },
    { label: "Secure Temporary File Sharing Without Signup: What to Look For", href: "/blog/secure-temporary-file-sharing-without-signup" },
  ],
  "send-pdf-from-phone-to-laptop-without-an-app": [
    { label: "How to Transfer Large Videos from iPhone to Android Without an App", href: "/blog/transfer-large-video-iphone-to-android-without-app" },
    { label: "How to Share Files Between Two Phones Without Installing an App", href: "/blog/share-files-between-two-phones-without-an-app" },
  ],
};

export default function Blog() {
  const [match, params] = useRoute("/blog/:slug");
  const article = match ? articles.find(item => item.slug === params?.slug) ?? null : null;
  useEffect(() => { setArticleMetadata(article); return () => document.getElementById("droply-blog-schema")?.remove(); }, [article]);

  if (match && !article) return <main className="info-shell"><header className="info-topbar"><Link href="/blog" className="wordmark"><span className="wordmark-dot" /> droply</Link><Link href="/blog" className="back-link"><ArrowLeft size={15} /> Back to blog</Link></header><div className="info-wrap"><div className="info-hero"><div className="kicker"><Sparkles size={15} /> NOT FOUND</div><h1>This guide has moved.</h1><p>Return to the Droply blog for practical, search-friendly file-sharing guides.</p><Link href="/blog" className="info-cta">Browse the guides <ArrowUpRight size={17} /></Link></div></div></main>;
  if (article) return <ArticleView article={article} />;
  return <BlogIndex />;
}

function BlogIndex() {
  return <main className="info-shell blog-shell"><header className="info-topbar"><Link href="/" className="wordmark"><span className="wordmark-dot" /> droply</Link><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to Droply</Link></header><div className="info-wrap"><div className="info-hero"><div className="kicker"><Sparkles size={15} /> DROPly GUIDES</div><h1>Share smarter, leave less behind.</h1><p>Practical answers for sending photos, videos, documents, links, and text between devices without signup.</p><Link href="/" className="info-cta">Create a private room <ArrowUpRight size={17} /></Link></div><div className="blog-grid">{articles.map(article => <Link key={article.slug} href={`/blog/${article.slug}`} className="blog-card"><div className="blog-card-top"><span className="blog-eyebrow">{article.eyebrow}</span><span>{article.readTime}</span></div><h2>{article.title}</h2><p>{article.description}</p><span className="blog-read">Read guide <ArrowUpRight size={15} /></span></Link>)}</div></div><BlogFooter /></main>;
}

function ArticleView({ article }: { article: Article }) {
  const related = RELATED[article.slug] ?? [];
  return (
    <main className="info-shell blog-shell">
      <header className="info-topbar"><Link href="/" className="wordmark"><span className="wordmark-dot" /> droply</Link><Link href="/blog" className="back-link"><ArrowLeft size={15} /> All guides</Link></header>
      <div className="article-wrap">
        <div className="article-hero">
          <div className="kicker"><Sparkles size={15} /> {article.eyebrow}</div>
          <h1>{article.title}</h1>
          {article.intro.map((block, i) => <Block key={i} block={block} />)}
          <div className="article-meta">
            <span>By Droply Team</span>
            <span>{formatDate(article.published)}</span>
            <span><Clock3 size={15} /> {article.readTime}</span>
            <span><LockKeyhole size={15} /> No signup required to use Droply</span>
          </div>
        </div>
        <article className="article-content">
          {article.sections.map(section => (
            <section key={section.heading}>
              <h2 id={section.headingId}>{section.heading}</h2>
              {section.blocks.map((block, i) => <Block key={i} block={block} />)}
            </section>
          ))}
          {related.length > 0 && (
            <div className="article-related">
              <span className="blog-eyebrow">RELATED GUIDES</span>
              <ul>
                {related.map(r => (
                  <li key={r.href}><Link href={r.href}>{r.label} <ArrowUpRight size={14} /></Link></li>
                ))}
              </ul>
            </div>
          )}
          <div className="article-cta"><div><span className="blog-eyebrow">READY WHEN YOU ARE</span><h2>Try the two-device handoff.</h2><p>Open a temporary room and share what matters right now.</p></div><Link href="/" className="info-cta">Open Droply <ArrowUpRight size={17} /></Link></div>
        </article>
      </div>
      <BlogFooter />
    </main>
  );
}

function BlogFooter() { return <footer className="info-footer"><span>droply / practical sharing guides</span><nav><Link href="/blog">Blog</Link><Link href="/how-it-works">How it works</Link><Link href="/security">Security</Link><Link href="/privacy">Privacy</Link><Link href="/faq">FAQ</Link></nav></footer>; }
