import { ArrowLeft, ArrowUpRight, Clock3, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link, useRoute } from "wouter";

type Article = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  readTime: string;
  published: string;
  keywords: string[];
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
};

const articles: Article[] = [
  {
    slug: "share-files-between-two-phones-without-an-app",
    title: "How to Share Files Between Two Phones Without Installing an App",
    description: "Learn how to send photos, videos, documents, links, and text between two phones without signup, cables, or a messaging app.",
    eyebrow: "PHONE TO PHONE",
    readTime: "5 min read",
    published: "2026-08-21",
    keywords: ["share files between two phones", "send files phone to phone", "transfer files without an app"],
    intro: "Sometimes the file is already on your phone, the other person is standing nearby, and installing another app is the slowest part of the task. A temporary browser room is a simpler way to create a quick handoff.",
    sections: [
      { heading: "The simplest phone-to-phone workflow", paragraphs: ["Open Droply in a browser on the sending phone and choose Sender. The room creates a short 4-digit code. On the receiving phone, open Droply, choose Receiver, and enter that code. There is no account, email address, or app installation in the middle.", "The sender can add images, videos, documents, links, and text to the same room. The receiver sees the shared feed, previews supported media in the browser, copies text, or downloads the file when ready."] },
      { heading: "Why a browser room can be better than a messaging app", paragraphs: ["Messaging apps are excellent for conversations, but a one-time file handoff does not always need a contact list, a group thread, or a permanent copy in chat history. A temporary room keeps the interaction focused on the file and gives both people a clear expiration window.", "This approach is also useful when the two people do not share the same communication app. One person reads the code aloud or shows it on screen, and the other enters it on any modern browser."] },
      { heading: "Tips for a smoother transfer", paragraphs: ["Keep both phones on a stable connection and leave the sender page open until the upload finishes. For a large video, use the upload progress indicator as a confirmation that the browser is still working. On the receiving device, preview an image or video before downloading it so you do not save the wrong file.", "Droply rooms are designed for short-lived sharing and currently support files up to 100 MB per file. Use a dedicated storage or collaboration service when you need long-term access."] },
    ],
  },
  {
    slug: "secure-temporary-file-sharing-without-signup",
    title: "Secure Temporary File Sharing Without Signup: What to Look For",
    description: "A practical guide to choosing a temporary file-sharing service without signup, including expiry, access control, previews, and honest privacy promises.",
    eyebrow: "PRIVACY GUIDE",
    readTime: "6 min read",
    published: "2026-08-21",
    keywords: ["secure file sharing without signup", "temporary file sharing", "private file transfer online"],
    intro: "No signup is useful, but it is not the same thing as complete anonymity or end-to-end encryption. The right question is what the service actually protects, how long content remains available, and how clearly those boundaries are explained.",
    sections: [
      { heading: "Start with the retention promise", paragraphs: ["Temporary sharing should have a visible end point. Look for a specific expiry period instead of vague language about files being removed later. Droply uses a 30-minute room model so the sharing purpose is explicit: send something now, retrieve it, and do not treat the room as a permanent drive.", "Short retention reduces accidental exposure, but it does not remove every risk. Network providers, hosting systems, browser history, and operational logs may still process technical information. Good privacy copy should say this plainly."] },
      { heading: "Separate access convenience from security claims", paragraphs: ["A link or code makes access convenient, but anyone who obtains the access detail may be able to attempt entry. A service should explain whether rooms are public, whether access expires, whether uploads are validated, and what happens when a room is closed.", "Droply keeps the flow small with a sender-created room, a 4-digit join code, server-side size and type validation, and no account requirement. These controls are practical boundaries, not a claim that every online transfer is invisible."] },
      { heading: "Preview before you download", paragraphs: ["Previewing an image or video in the browser is a privacy and usability improvement. It lets the recipient confirm the content before saving it to a phone, which is especially helpful when a room contains multiple files with similar names.", "A strong temporary sharing tool should also provide visible upload and download progress, cancellation feedback, and a clear failure state. Those details matter because a transfer that appears frozen encourages duplicate taps and accidental retries."] },
      { heading: "A short checklist", paragraphs: ["Before sharing, confirm the recipient, the expiry window, the maximum file size, and whether the content is appropriate for the service. After the recipient has what they need, close the tab and avoid reusing a room for unrelated files. Temporary sharing is safest when it stays temporary in both technology and behavior."] },
    ],
  },
  {
    slug: "send-large-files-phone-to-phone-4-digit-code",
    title: "How to Send Large Files from Phone to Phone with a 4-Digit Code",
    description: "Send a large photo, video, or document from one phone to another with a temporary 4-digit sharing code and browser-based progress tracking.",
    eyebrow: "QUICK HOW-TO",
    readTime: "4 min read",
    published: "2026-08-21",
    keywords: ["send large files from phone to phone", "4 digit file sharing code", "share video without WhatsApp"],
    intro: "A 4-digit code is easy to read aloud, type on a small keyboard, and verify at a glance. It turns a complicated transfer link into a simple two-device handoff.",
    sections: [
      { heading: "Step 1: Create the temporary room", paragraphs: ["On the phone that has the file, open Droply and select Sender. The service creates a temporary room and displays its 4-digit code. The sender can upload one file or a batch, including a video, image, document, text, or link."] },
      { heading: "Step 2: Join from the receiving phone", paragraphs: ["Open Droply on the second phone, select Receiver, and enter the same four digits. Once connected, the receiver sees the room feed and the sender can see that another participant has joined. No signup or shared messaging account is required."] },
      { heading: "Step 3: Check the file before downloading", paragraphs: ["Images and videos can be previewed directly in the browser. For a document or other file, check its name and size before selecting Download. The download panel shows percentage and transferred bytes, and the receiver can cancel an active transfer if the connection needs to be restarted.", "If the transfer is interrupted, reconnect to the room while it is still active and try again. A 30-minute expiry keeps the room focused on the current handoff rather than long-term storage."] },
      { heading: "When to use a different tool", paragraphs: ["Droply is designed for a quick one-to-one exchange and currently supports files up to 100 MB per file. For multi-gigabyte production deliveries, team permissions, or permanent archives, use a dedicated cloud storage or large-transfer platform instead."] },
    ],
    },
  {
    slug: "send-pdf-from-phone-to-laptop-without-an-app",
    title: "How to Send a PDF from Phone to Laptop Without an App",
    description: "Transfer a PDF from a phone to a laptop in a browser with a short code, no cable, no account, and no app installation.",
    eyebrow: "PHONE TO LAPTOP",
    readTime: "5 min read",
    published: "2026-08-27",
    keywords: ["send PDF from phone to laptop", "transfer PDF without app", "share PDF phone to computer"],
    intro: "When a PDF is already on your phone and you need it on a laptop right away, emailing it to yourself or installing another app can add unnecessary steps. A short browser room gives both devices a simple place to meet.",
    sections: [
      { heading: "Open the room on the phone", paragraphs: ["On the phone holding the PDF, open Droply and choose Sender. A temporary room opens with a 4-digit code. Add the PDF to the room and keep the sender page open while the upload finishes.", "The code is designed for an immediate handoff: read it aloud, show it on screen, or send it to the recipient through a channel you already use. No Droply account is needed on either device."] },
      { heading: "Join from the laptop", paragraphs: ["On the laptop, open Droply in any modern browser, choose Receiver, and enter the same 4-digit code. The PDF appears in the room feed once the upload is complete. Check the filename and size, then download it directly to the laptop.", "This browser-based workflow is useful when the phone and laptop do not share the same messaging app, cable, or operating-system ecosystem."] },
      { heading: "Keep a one-time transfer temporary", paragraphs: ["A short-lived room is useful for a document you need right now, not as a permanent archive. Droply rooms expire after 30 minutes and currently support files up to 100 MB each. For recurring collaboration, sensitive long-term records, or larger files, use a storage service designed for those needs."] },
    ],
  },
];

function setArticleMetadata(article: Article | null) {
  const title = article ? `${article.title} | Droply` : "Droply Blog — Practical Guides to Private File Sharing";
  const description = article?.description ?? "Practical guides to sharing files, photos, videos, text, and links privately between devices without signup.";
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('meta[name="robots"]')?.setAttribute("content", "index,follow,max-image-preview:large");
  const schemaId = "droply-blog-schema";
  document.getElementById(schemaId)?.remove();
  const url = `${window.location.origin}${article ? `/blog/${article.slug}` : "/blog"}`;
  const graph: Record<string, unknown>[] = [{ "@type": "WebPage", "@id": url, url, name: title, description, isPartOf: { "@type": "WebSite", name: "Droply", url: window.location.origin } }];
  if (article) graph.push({ "@type": "Article", headline: article.title, description, datePublished: article.published, dateModified: article.published, author: { "@type": "Organization", name: "Droply" }, publisher: { "@type": "Organization", name: "Droply" }, mainEntityOfPage: url, keywords: article.keywords.join(", ") });
  else graph.push({ "@type": "CollectionPage", name: title, mainEntity: articles.map(item => `${window.location.origin}/blog/${item.slug}`) });
  const script = document.createElement("script");
  script.id = schemaId;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  document.head.appendChild(script);
}

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
  return <main className="info-shell blog-shell"><header className="info-topbar"><Link href="/" className="wordmark"><span className="wordmark-dot" /> droply</Link><Link href="/blog" className="back-link"><ArrowLeft size={15} /> All guides</Link></header><div className="article-wrap"><div className="article-hero"><div className="kicker"><Sparkles size={15} /> {article.eyebrow}</div><h1>{article.title}</h1><p>{article.intro}</p><div className="article-meta"><span><Clock3 size={15} /> {article.readTime}</span><span><LockKeyhole size={15} /> No signup required to use Droply</span></div></div><article className="article-content">{article.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}<div className="article-cta"><div><span className="blog-eyebrow">READY WHEN YOU ARE</span><h2>Try the two-device handoff.</h2><p>Open a temporary room and share what matters right now.</p></div><Link href="/" className="info-cta">Open Droply <ArrowUpRight size={17} /></Link></div></article></div><BlogFooter /></main>;
}

function BlogFooter() { return <footer className="info-footer"><span>droply / practical sharing guides</span><nav><Link href="/blog">Blog</Link><Link href="/how-it-works">How it works</Link><Link href="/security">Security</Link><Link href="/privacy">Privacy</Link><Link href="/faq">FAQ</Link></nav></footer>; }
