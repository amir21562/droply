import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/blog", label: "Guides" },
  { href: "/faq", label: "FAQ" },
  { href: "/security", label: "Security" },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

/** Sticky site-wide menu bar: desktop links + mobile hamburger. */
export function SiteHeader() {
  const [path] = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  const onHome = path === "/";

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="wordmark" aria-label="Droply home">
          <span className="wordmark-dot" /> droply
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} className={isActive(path, link.href) ? "active" : ""}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header-actions">
          {!onHome && <Link href="/" className="site-cta">Share files</Link>}
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(value => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          <Link href="/" className={onHome ? "active" : ""}>Home</Link>
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} className={isActive(path, link.href) ? "active" : ""}>
              {link.label}
            </Link>
          ))}
          <Link href="/privacy" className={isActive(path, "/privacy") ? "active" : ""}>Privacy</Link>
        </nav>
      )}
    </header>
  );
}

/** Shared footer for all public pages. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link href="/" className="wordmark" aria-label="Droply home">
          <span className="wordmark-dot" /> droply
        </Link>
        <nav className="site-footer-nav" aria-label="Footer navigation">
          <Link href="/how-it-works">How it works</Link>
          <Link href="/blog">Guides</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/security">Security</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <span className="footer-note">Quick sharing for real life — gone in 30 minutes, not 30 days.</span>
      </div>
    </footer>
  );
}
