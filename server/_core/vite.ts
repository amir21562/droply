import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// Known SEO routes that have prerendered HTML in dist/public/seo/.
const SEO_PAGES: Record<string, string> = {
  "/": "home.html",
  "/how-it-works": "how-it-works.html",
  "/security": "security.html",
  "/privacy": "privacy.html",
  "/faq": "faq.html",
  "/blog": "blog.html",
};

const BLOG_SLUGS = [
  "transfer-large-video-iphone-to-android-without-app",
  "share-files-between-two-phones-without-an-app",
  "secure-temporary-file-sharing-without-signup",
  "send-large-files-phone-to-phone-4-digit-code",
  "send-pdf-from-phone-to-laptop-without-an-app",
];

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  const seoPath = path.join(distPath, "seo");

  // (1) Trailing-slash 301 — canonical URLs never have a trailing slash.
  //     Skips API routes, asset paths and file-like paths.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const qIndex = req.originalUrl.indexOf("?");
    const pathname = qIndex === -1 ? req.originalUrl : req.originalUrl.slice(0, qIndex);
    const query = qIndex === -1 ? "" : req.originalUrl.slice(qIndex);
    const isFile = /\.[a-z0-9]+$/i.test(pathname);
    if (
      pathname.length > 1 &&
      pathname.endsWith("/") &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/assets/") &&
      !isFile
    ) {
      return res.redirect(301, pathname.slice(0, -1) + query);
    }
    next();
  });

  // (2) Real favicon — never let /favicon.ico fall through to the SPA HTML.
  app.get("/favicon.ico", (_req, res) => {
    res.sendFile(path.resolve(distPath, "favicon.svg"), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=2592000" },
    });
  });

  // (3) Prerendered SEO HTML for the known public routes.
  const sendSeo = (file: string) => (_req: express.Request, res: express.Response) => {
    const p = path.resolve(seoPath, file);
    if (fs.existsSync(p)) {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      return res.sendFile(p);
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  };
  for (const [route, file] of Object.entries(SEO_PAGES)) {
    app.get(route, sendSeo(file));
  }
  app.get("/blog/:slug", (req, res, next) => {
    const slug = String(req.params.slug || "");
    if (!BLOG_SLUGS.includes(slug)) return next();
    return sendSeo(`blog-${slug}.html`)(req, res);
  });

  // (4) Static assets — hashed /assets/* immutable for a year; HTML never
  //     long-cached; sitemap/robots cached for an hour.
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
    })
  );
  app.use(
    express.static(distPath, {
      maxAge: "30d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        }
        if (filePath.endsWith("sitemap.xml") || filePath.endsWith("robots.txt")) {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    })
  );

  // (5) SPA fallback — last.
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
