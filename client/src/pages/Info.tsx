import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, type ReactNode } from "react";

const pageData = {
  how: {
    title: "How Droply Works — Private File Sharing Without Signup",
    description: "Learn how Droply lets you share files, links, images, videos, and text with one person using a temporary 4-digit room code.",
    eyebrow: "HOW IT WORKS",
    heading: "A private handoff in three quiet steps.",
    intro: "Droply is built for the moment when you need to send something to one person—not store it forever.",
  },
  security: {
    title: "Droply Security — Temporary Private File Sharing",
    description: "Understand Droply’s temporary rooms, expiry behavior, file validation, and the security controls planned for private sharing.",
    eyebrow: "SECURITY",
    heading: "Privacy should be visible, not vague.",
    intro: "Droply keeps the handoff small, temporary, and explicit. We explain what happens to your content instead of hiding behind broad security slogans.",
  },
  privacy: {
    title: "Droply Privacy — No Signup Temporary Sharing",
    description: "Read how Droply handles temporary rooms, shared content, expiration, and anonymous use without requiring an account.",
    eyebrow: "PRIVACY",
    heading: "Share less. Leave less behind.",
    intro: "Droply is designed for one-time sharing without an account. Temporary rooms are not a personal cloud drive and should not be treated like one.",
  },
  faq: {
    title: "Droply FAQ — Temporary File Sharing Questions",
    description: "Answers about Droply room codes, file types, 100 MB file limits, expiration, downloads, and anonymous sharing.",
    eyebrow: "FAQ",
    heading: "The useful answers, upfront.",
    intro: "A short guide to the questions people ask before sending something private through a temporary room.",
  },
} as const;

type PageKey = keyof typeof pageData;

export default function Info({ page }: { page: PageKey }) {
  const data = pageData[page];
  useEffect(() => {
    document.title = data.title;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", data.description);
    const robots = document.querySelector('meta[name="robots"]');
    robots?.setAttribute("content", "index,follow,max-image-preview:large");
    const schemaId = "droply-page-schema";
    document.getElementById(schemaId)?.remove();
    const pageUrl = `${window.location.origin}/${page === "how" ? "how-it-works" : page}`;
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", pageUrl);
    const graph: Record<string, unknown>[] = [{ "@type": "WebPage", "@id": pageUrl, url: pageUrl, name: data.title, description: data.description, isPartOf: { "@type": "WebSite", name: "Droply", url: window.location.origin } }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Droply", item: window.location.origin }, { "@type": "ListItem", position: 2, name: data.eyebrow, item: pageUrl }] }];
    if (page === "faq") {
      // Keep in sync with scripts/prerender-seo.mjs FAQ_QA and the visible FAQ list below.
      const faqPairs: [string, string][] = [
        ["What is Droply?", "Droply is a free browser-based tool for sharing files, links and text. You create a temporary room, get a private 4-digit code, and anyone with the code can join from any device — no signup and no app install needed."],
        ["How does the 4-digit code work?", "When you create a room, Droply gives you a unique 4-digit code. Share that code with the other person — they enter it on droply.promptifyer.online from any device and instantly join your room to send or receive files."],
        ["Do I need to sign up or install an app?", "No. Droply works entirely in the browser with no account and no installation. Open the site, create or join a room with a 4-digit code, and start sharing."],
        ["What is the file size limit?", "Each transfer supports files up to 100 MB. You can share documents, photos, videos, links and text within that limit, free."],
        ["How long do Droply rooms last?", "Rooms are temporary by design and expire automatically after 30 minutes. Once a room expires, its code stops working and the shared content is no longer accessible."],
        ["Is Droply private and secure?", "Yes. Rooms are private by default — only people with your 4-digit code can join. There are no accounts to hack, rooms expire automatically after 30 minutes, and the site is served over HTTPS. See our Security page for details."],
        ["Which devices does Droply work on?", "Any device with a modern browser: iPhone, Android, Windows, Mac and Linux. It's ideal for moving files between your own devices, like from phone to laptop, or sharing with someone else."],
        ["Is Droply free?", "Yes, Droply is completely free — share files up to 100 MB per transfer with no account, no subscription and no hidden limits on the number of rooms you create."],
      ];
      graph.push({ "@type": "FAQPage", mainEntity: faqPairs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) });
    }
    const script = document.createElement("script"); script.id = schemaId; script.type = "application/ld+json"; script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }); document.head.appendChild(script);
    return () => document.getElementById(schemaId)?.remove();
  }, [data, page]);

  return (
    <main className="info-shell">
      <header className="info-topbar">
        <Link href="/" className="wordmark"><span className="wordmark-dot" /> droply</Link>
        <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to Droply</Link>
      </header>
      <div className="info-wrap">
        <div className="info-hero">
          <div className="kicker"><SparkMark /> {data.eyebrow}</div>
          <h1>{data.heading}</h1>
          <p>{data.intro}</p>
          <Link href="/" className="info-cta">Create a private room <ArrowUpRight size={17} /></Link>
        </div>
        <div className="info-content">
          {page === "how" && <HowContent />}
          {page === "security" && <SecurityContent />}
          {page === "privacy" && <PrivacyContent />}
          {page === "faq" && <FaqContent />}
        </div>
      </div>
      <footer className="info-footer"><span>droply / quick sharing for real life</span><nav><Link href="/how-it-works">How it works</Link><Link href="/security">Security</Link><Link href="/privacy">Privacy</Link><Link href="/faq">FAQ</Link></nav></footer>
    </main>
  );
}

function SparkMark() { return <span className="spark-mark">✦</span>; }

function HowContent() {
  return <>
    <section className="info-card"><Step number="01" title="Choose Sender">Open Droply and choose “I am Sender.” No account, email, or password is needed.</Step><Step number="02" title="Share the code">Drop files or add text and links. Droply gives you a short 4-digit code and a shareable room link.</Step><Step number="03" title="Hand it over">Your receiver enters the code, sees the shared feed, previews supported media, and copies or downloads what they need.</Step></section>
    <section className="info-grid"><Feature icon={<Clock3 size={19} />} title="Temporary by default" text="Rooms are designed for the immediate handoff and expire automatically after 30 minutes." /><Feature icon={<LockKeyhole size={19} />} title="No account required" text="The sender and receiver use a code instead of a signup flow, keeping the interaction fast." /><Feature icon={<CheckCircle2 size={19} />} title="Mixed content" text="Share files, images, videos, links, and text together in one chronological room feed." /></section>
  </>;
}

function SecurityContent() {
  return <>
    <section className="info-card"><h2>What Droply protects</h2><p>Rooms are temporary and access is based on a short code or room link. The product validates file type and size at the client and server boundaries, and the current launch limit is 100 MB per file.</p><p>For a production-scale release, Droply should use durable session storage, object storage or a peer/relay transport, rate limiting, malware scanning, abuse reporting, and a documented deletion process. The public security promise must always match the deployed implementation.</p></section>
    <section className="info-grid"><Feature icon={<ShieldCheck size={19} />} title="Precise promises" text="We prefer specific statements about storage, expiry, access, and encryption over vague claims." /><Feature icon={<LockKeyhole size={19} />} title="Short-lived access" text="Temporary rooms reduce the time content is available and make the sharing purpose explicit." /><Feature icon={<CheckCircle2 size={19} />} title="Safe boundaries" text="File size and content-type validation help keep anonymous sharing practical and abuse-aware." /></section>
  </>;
}

function PrivacyContent() {
  return <section className="info-card"><h2>Designed for one-time sharing</h2><p>Droply does not require signup for the sender or receiver. A room is a temporary handoff space, not a permanent storage account. Do not place highly sensitive data in any online service unless your own risk requirements have been reviewed.</p><h2>Retention and expiration</h2><p>Rooms are intended to expire automatically after 30 minutes. Production storage and deletion guarantees should be verified against the live infrastructure before using Droply for regulated or confidential material.</p><h2>What we do not promise</h2><p>“No signup” does not mean invisible to the entire internet. Network providers, hosting infrastructure, security systems, and operational logs may still process technical data. We will document those boundaries clearly rather than implying absolute anonymity.</p></section>;
}

function FaqContent() {
  // Visible FAQ text must match the FAQPage JSON-LD (client-side + prerendered) exactly.
  const faqs: [string, string][] = [
    ["What is Droply?", "Droply is a free browser-based tool for sharing files, links and text. You create a temporary room, get a private 4-digit code, and anyone with the code can join from any device — no signup and no app install needed."],
    ["How does the 4-digit code work?", "When you create a room, Droply gives you a unique 4-digit code. Share that code with the other person — they enter it on droply.promptifyer.online from any device and instantly join your room to send or receive files."],
    ["Do I need to sign up or install an app?", "No. Droply works entirely in the browser with no account and no installation. Open the site, create or join a room with a 4-digit code, and start sharing."],
    ["What is the file size limit?", "Each transfer supports files up to 100 MB. You can share documents, photos, videos, links and text within that limit, free."],
    ["How long do Droply rooms last?", "Rooms are temporary by design and expire automatically after 30 minutes. Once a room expires, its code stops working and the shared content is no longer accessible."],
    ["Is Droply private and secure?", "Yes. Rooms are private by default — only people with your 4-digit code can join. There are no accounts to hack, rooms expire automatically after 30 minutes, and the site is served over HTTPS. See our Security page for details."],
    ["Which devices does Droply work on?", "Any device with a modern browser: iPhone, Android, Windows, Mac and Linux. It's ideal for moving files between your own devices, like from phone to laptop, or sharing with someone else."],
    ["Is Droply free?", "Yes, Droply is completely free — share files up to 100 MB per transfer with no account, no subscription and no hidden limits on the number of rooms you create."],
  ];
  return <section className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>;
}

function Step({ number, title, children }: { number: string; title: string; children: string }) { return <div className="info-step"><span>{number}</span><div><h3>{title}</h3><p>{children}</p></div></div>; }
function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="info-feature"><div className="info-feature-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div></div>; }
