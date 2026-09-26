// scripts/prerender-seo.mjs
// Phase-1 SEO: post-build prerender of per-route HTML for crawlers.
//
// Reads dist/public/index.html (built by `vite build`) and writes one SEO HTML
// file per public route into dist/public/seo/*.html, each with a UNIQUE
// <title>, meta description, SELF-REFERENCING canonical, OG/Twitter tags and
// per-page JSON-LD. The Express server (server/_core/vite.ts) serves these
// files to matching routes; the SPA fallback handles everything else.
//
// Run: `vite build && node scripts/prerender-seo.mjs && esbuild ...`
// (wired into package.json "build")

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist", "public");
const TEMPLATE = path.join(DIST, "index.html");
const SEO_DIR = path.join(DIST, "seo");

const BASE = "https://droply.promptifyer.online";
const OG_IMAGE = `${BASE}/og-image.png`;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace the <title> tag (first occurrence). */
function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
}

/** Replace an existing meta tag (by name= or property=) or insert before </head>. */
function upsertMeta(html, name, attr, content) {
  const tag = `<meta ${attr}="${name}" content="${escapeAttr(content)}">`;
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${escapeRegExp(name)}["'][^>]*>`, "i");
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

/** Replace an existing <link rel=...> or insert before </head>. */
function upsertLink(html, rel, href) {
  const tag = `<link rel="${rel}" href="${escapeAttr(href)}">`;
  const re = new RegExp(`<link[^>]+rel=["']${escapeRegExp(rel)}["'][^>]*>`, "i");
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function jsonLdScript(obj) {
  // Guard: never emit a literal </script> inside JSON-LD.
  const json = JSON.stringify(obj).replace(/<\/script/gi, "<\\/script");
  return `<script type="application/ld+json">${json}</script>`;
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

function articleSchema({ slug, title, description, published }) {
  const url = `${BASE}/blog/${slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: OG_IMAGE,
    url,
    datePublished: published,
    dateModified: published,
    author: { "@type": "Organization", name: "Droply", url: `${BASE}/` },
    publisher: {
      "@type": "Organization",
      name: "Droply",
      url: `${BASE}/`,
      logo: { "@type": "ImageObject", url: `${BASE}/icon-192.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

// ---------------------------------------------------------------------------
// schema payloads (content from ~/workspace/droply-audit/phase1/SCHEMA.md)
// ---------------------------------------------------------------------------

const SOFTWARE_APPLICATION = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Droply",
  url: `${BASE}/`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires JavaScript. Works in any modern browser — no install needed.",
  description:
    "Droply lets you share files, links and text instantly with a private 4-digit code. No signup, no app. Free 100 MB transfers in temporary rooms that expire automatically.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free file transfers up to 100 MB per transfer",
  },
  featureList:
    "4-digit code rooms, No signup required, 100 MB per transfer, Temporary auto-expiring rooms, Works on phone and desktop",
  screenshot: OG_IMAGE,
  author: { "@type": "Organization", name: "Droply", url: `${BASE}/` },
};

const FAQ_QA = [
  [
    "What is Droply?",
    "Droply is a free browser-based tool for sharing files, links and text. You create a temporary room, get a private 4-digit code, and anyone with the code can join from any device — no signup and no app install needed.",
  ],
  [
    "How does the 4-digit code work?",
    "When you create a room, Droply gives you a unique 4-digit code. Share that code with the other person — they enter it on droply.promptifyer.online from any device and instantly join your room to send or receive files.",
  ],
  [
    "Do I need to sign up or install an app?",
    "No. Droply works entirely in the browser with no account and no installation. Open the site, create or join a room with a 4-digit code, and start sharing.",
  ],
  [
    "What is the file size limit?",
    "Each transfer supports files up to 100 MB. You can share documents, photos, videos, links and text within that limit, free.",
  ],
  [
    "How long do Droply rooms last?",
    "Rooms are temporary by design and expire automatically after 30 minutes. Once a room expires, its code stops working and the shared content is no longer accessible.",
  ],
  [
    "Is Droply private and secure?",
    "Yes. Rooms are private by default — only people with your 4-digit code can join. There are no accounts to hack, rooms expire automatically after 30 minutes, and the site is served over HTTPS. See our Security page for details.",
  ],
  [
    "Which devices does Droply work on?",
    "Any device with a modern browser: iPhone, Android, Windows, Mac and Linux. It's ideal for moving files between your own devices, like from phone to laptop, or sharing with someone else.",
  ],
  [
    "Is Droply free?",
    "Yes, Droply is completely free — share files up to 100 MB per transfer with no account, no subscription and no hidden limits on the number of rooms you create.",
  ],
];

const FAQ_PAGE = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_QA.map(([name, text]) => ({
    "@type": "Question",
    name,
    acceptedAnswer: { "@type": "Answer", text },
  })),
};

const HOW_TO = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to share files with Droply",
  description:
    "Share files, links and text between any devices using a private 4-digit code — no signup, no app install.",
  totalTime: "PT1M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Create a room",
      text: "Open droply.promptifyer.online and tap Get Started. Droply instantly creates a private room and shows your unique 4-digit code — no signup needed.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Share the 4-digit code",
      text: "Send the 4-digit code to the other person by message, or read it out. Only people with the code can join your room.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Enter the code and transfer",
      text: "The recipient enters the code on any device to join the room, then uploads or downloads files up to 100 MB. The room expires automatically after 30 minutes.",
    },
  ],
};

// ---------------------------------------------------------------------------
// route table (meta content from ~/workspace/droply-audit/phase1/META-TAGS.md)
// ---------------------------------------------------------------------------

const POSTS = [
  {
    slug: "transfer-large-video-iphone-to-android-without-app",
    title: "iPhone to Android Video Transfer Without an App | Droply",
    articleTitle: "How to Transfer Large Videos from iPhone to Android Without an App",
    description:
      "Learn how to transfer large videos from iPhone to Android without installing an app. Use Droply's 4-digit code to send videos up to 100 MB free, no signup.",
    ogTitle: "How to Transfer Large Videos from iPhone to Android Without an App",
    ogDescription:
      "Transfer large videos from iPhone to Android without installing an app — just a 4-digit code. Free, no signup.",
    published: "2026-09-02",
  },
  {
    slug: "share-files-between-two-phones-without-an-app",
    title: "Share Files Between Two Phones Without an App | Droply",
    articleTitle: "How to Share Files Between Two Phones Without Installing an App",
    description:
      "Share files between two phones without installing an app. Create a Droply room, share the 4-digit code, and transfer photos, videos and docs in seconds.",
    ogTitle: "How to Share Files Between Two Phones Without Installing an App",
    ogDescription:
      "Share files between two phones with no app install — one 4-digit code moves photos, videos and documents in seconds.",
    published: "2026-08-21",
  },
  {
    slug: "secure-temporary-file-sharing-without-signup",
    title: "Secure Temporary File Sharing Without Signup | Droply",
    articleTitle: "Secure Temporary File Sharing Without Signup: What to Look For",
    description:
      "What makes file sharing secure without signup? Temporary rooms, private codes and auto-expiry. See what to look for in a tool — and how Droply does it.",
    ogTitle: "Secure Temporary File Sharing Without Signup: What to Look For",
    ogDescription:
      "Temporary rooms, private 4-digit codes, auto-expiry — what secure file sharing without signup really looks like.",
    published: "2026-08-21",
  },
  {
    slug: "send-large-files-phone-to-phone-4-digit-code",
    title: "Send Large Files Phone to Phone with a 4-Digit Code | Droply",
    articleTitle: "How to Send Large Files from Phone to Phone with a 4-Digit Code",
    description:
      "Send large files from phone to phone using a simple 4-digit code. No signup, no app — create a free Droply room and share files up to 100 MB per transfer.",
    ogTitle: "How to Send Large Files from Phone to Phone with a 4-Digit Code",
    ogDescription:
      "Phone-to-phone file transfer with a 4-digit code. No signup, no app — share up to 100 MB per transfer with Droply.",
    published: "2026-08-21",
  },
  {
    slug: "send-pdf-from-phone-to-laptop-without-an-app",
    title: "Send a PDF from Phone to Laptop Without an App | Droply",
    articleTitle: "How to Send a PDF from Phone to Laptop Without an App",
    description:
      "Send a PDF from your phone to a laptop without an app. Open Droply on both devices, enter the 4-digit code, and transfer in seconds — no signup needed.",
    ogTitle: "How to Send a PDF from Phone to Laptop Without an App",
    ogDescription:
      "Phone-to-laptop PDF transfer without an app: open Droply on both devices, enter the 4-digit code, done in seconds.",
    published: "2026-08-27",
  },
  {
    slug: "droply-vs-wetransfer-vs-smash",
    title: "Droply vs WeTransfer vs Smash: Honest Comparison | Droply",
    articleTitle: "Droply vs WeTransfer vs Smash: Honest Comparison for One-Time Sharing",
    description:
      "Droply vs WeTransfer vs Smash vs SwissTransfer vs FilePizza, compared honestly: size limits, expiry, signup friction — and where each tool actually wins.",
    ogTitle: "Droply vs WeTransfer vs Smash: Honest Comparison for One-Time Sharing",
    ogDescription:
      "Five free file-sharing tools compared honestly — limits, expiry, and where each one actually wins.",
    published: "2026-09-25",
  },
  {
    slug: "b1-is-it-safe-without-account",
    title: "Is It Safe to Share Files Without an Account? | Droply",
    articleTitle: "Is It Safe to Share Files Without an Account? An Honest Answer",
    description:
      "Is sharing files without an account safe? An honest answer: what no-signup removes, what it doesn't protect, and when an account is actually the safer choice.",
    ogTitle: "Is It Safe to Share Files Without an Account? An Honest Answer",
    ogDescription:
      "What no-signup file sharing changes, what it doesn't protect, and five rules for doing it safely.",
    published: "2026-09-25",
  },
  {
    slug: "transfer-files-android-to-iphone-without-app",
    title: "Transfer Files from Android to iPhone Without an App | Droply",
    articleTitle: "How to Transfer Files from Android to iPhone Without an App",
    description:
      "Transfer files from Android to iPhone without an app: where Quick Share meets AirDrop in 2026, where it doesn't, and the 4-digit-code method that works on any phones.",
    ogTitle: "How to Transfer Files from Android to iPhone Without an App",
    ogDescription:
      "Android to iPhone file transfer with no app install — Quick Share vs AirDrop in 2026, and the 4-digit code that works on any pair of phones.",
    published: "2026-09-26",
  },
];

const ROUTES = [
  {
    file: "home.html",
    canonical: `${BASE}/`,
    title: "Share Files Without Signup — 4-Digit Code | Droply",
    description:
      "Send files, links and text instantly with a private 4-digit code. No signup, no app. Free 100 MB transfers in temporary rooms that expire automatically.",
    ogType: "website",
    ogTitle: "Droply — Share Files, Links & Text Without Signup",
    ogDescription:
      "Send files, links and text instantly with a private 4-digit code. No signup, no app. Free 100 MB transfers.",
    schemas: [SOFTWARE_APPLICATION],
  },
  {
    file: "how-it-works.html",
    canonical: `${BASE}/how-it-works`,
    title: "How It Works — Share Files with a 4-Digit Code | Droply",
    description:
      "Learn how Droply works: create a private room, share your 4-digit code, and transfer files between any devices. No signup, no app install — done in seconds.",
    ogType: "website",
    ogTitle: "How Droply Works — Share Files with a 4-Digit Code",
    ogDescription:
      "Create a room, share your 4-digit code, transfer files between any devices. No signup, no app install.",
    schemas: [
      HOW_TO,
      breadcrumbSchema([
        { name: "Home", url: `${BASE}/` },
        { name: "How it works", url: `${BASE}/how-it-works` },
      ]),
    ],
  },
  {
    file: "security.html",
    canonical: `${BASE}/security`,
    title: "Security & Privacy — Temporary File Sharing | Droply",
    description:
      "Droply keeps sharing private: temporary rooms, 4-digit codes and 100 MB transfers that auto-expire. See how we protect your files — no accounts, no tracking.",
    ogType: "website",
    ogTitle: "Security — Private Temporary File Sharing | Droply",
    ogDescription:
      "Temporary rooms, 4-digit codes, auto-expiring transfers. How Droply keeps your file sharing private.",
    schemas: [
      breadcrumbSchema([
        { name: "Home", url: `${BASE}/` },
        { name: "Security", url: `${BASE}/security` },
      ]),
    ],
  },
  {
    file: "privacy.html",
    canonical: `${BASE}/privacy`,
    title: "Privacy Policy — Droply Private File Sharing, No Signup",
    description:
      "Read Droply's privacy policy: what data we collect, how temporary rooms work, and your rights as a user. Private by design — no accounts, no tracking ever.",
    ogType: "website",
    ogTitle: "Privacy Policy | Droply",
    ogDescription:
      "Droply's privacy policy: what data we collect, how temporary rooms work, and your rights.",
    schemas: [
      breadcrumbSchema([
        { name: "Home", url: `${BASE}/` },
        { name: "Privacy Policy", url: `${BASE}/privacy` },
      ]),
    ],
  },
  {
    file: "faq.html",
    canonical: `${BASE}/faq`,
    title: "Droply FAQ: 4-Digit Code File Sharing Without Signup",
    description:
      "Droply FAQ: how the 4-digit code works, the 100 MB file limit, room expiry, supported devices and privacy. Share files without signup — get answers here.",
    ogType: "website",
    ogTitle: "Droply FAQ — File Sharing Without Signup",
    ogDescription:
      "How the 4-digit code works, file limits, room expiry, supported devices and privacy. All Droply questions answered.",
    schemas: [
      FAQ_PAGE,
      breadcrumbSchema([
        { name: "Home", url: `${BASE}/` },
        { name: "FAQ", url: `${BASE}/faq` },
      ]),
    ],
  },
  {
    file: "blog.html",
    canonical: `${BASE}/blog`,
    title: "Droply Blog — File Sharing Tips & Guides, No Signup",
    description:
      "Droply blog: practical guides to sharing files without signup — phone-to-phone transfers, iPhone to Android, PDFs to laptop, and private sharing tips.",
    ogType: "website",
    ogTitle: "Droply Blog — File Sharing Tips & Guides",
    ogDescription:
      "Practical guides to sharing files without signup: phone-to-phone transfers, iPhone to Android, PDFs to laptop.",
    schemas: [
      breadcrumbSchema([
        { name: "Home", url: `${BASE}/` },
        { name: "Blog", url: `${BASE}/blog` },
      ]),
    ],
  },
  ...POSTS.map((p) => ({
    file: `blog-${p.slug}.html`,
    canonical: `${BASE}/blog/${p.slug}`,
    title: p.title,
    description: p.description,
    ogType: "article",
    ogTitle: p.ogTitle,
    ogDescription: p.ogDescription,
    schemas: [
      articleSchema({ slug: p.slug, title: p.articleTitle, description: p.description, published: p.published }),
      breadcrumbSchema([
        { name: "Home", url: `${BASE}/` },
        { name: "Blog", url: `${BASE}/blog` },
        { name: p.articleTitle, url: `${BASE}/blog/${p.slug}` },
      ]),
    ],
  })),
];

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

function renderRoute(template, route) {
  let html = template;

  html = setTitle(html, route.title);
  html = upsertMeta(html, "description", "name", route.description);
  html = upsertLink(html, "canonical", route.canonical);

  html = upsertMeta(html, "og:type", "property", route.ogType);
  html = upsertMeta(html, "og:site_name", "property", "Droply");
  html = upsertMeta(html, "og:title", "property", route.ogTitle);
  html = upsertMeta(html, "og:description", "property", route.ogDescription);
  html = upsertMeta(html, "og:url", "property", route.canonical);
  html = upsertMeta(html, "og:image", "property", OG_IMAGE);
  html = upsertMeta(html, "og:image:width", "property", "1200");
  html = upsertMeta(html, "og:image:height", "property", "630");

  html = upsertMeta(html, "twitter:card", "name", "summary_large_image");
  html = upsertMeta(html, "twitter:title", "name", route.ogTitle);
  html = upsertMeta(html, "twitter:description", "name", route.ogDescription);
  html = upsertMeta(html, "twitter:image", "name", OG_IMAGE);

  const ld = route.schemas.map(jsonLdScript).join("\n  ");
  html = html.replace("</head>", `  ${ld}\n</head>`);

  return html;
}

function main() {
  if (!fs.existsSync(TEMPLATE)) {
    console.error(`[prerender-seo] template not found: ${TEMPLATE} — run \`vite build\` first`);
    process.exit(1);
  }
  fs.mkdirSync(SEO_DIR, { recursive: true });
  const template = fs.readFileSync(TEMPLATE, "utf-8");

  for (const route of ROUTES) {
    const out = renderRoute(template, route);
    const outPath = path.join(SEO_DIR, route.file);
    fs.writeFileSync(outPath, out);
    console.log(`[prerender-seo] ${route.canonical} -> seo/${route.file}`);
  }
  console.log(`[prerender-seo] done: ${ROUTES.length} pages`);
}

main();
