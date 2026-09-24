import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter, addAnonymousItem, getAnonymousDownload, getAnonymousFile, leaveAnonymousParticipant, prepareAnonymousDownload, updateAnonymousDownload, updateAnonymousDownloadProgress } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number ): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Security Headers for Best Practices
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https://www.google-analytics.com; " +
      "connect-src 'self' https://www.google-analytics.com;"
     );
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/session/leave", (req, res) => { const { sessionId, participantId } = req.body ?? {}; if (typeof sessionId === "string" && typeof participantId === "string") leaveAnonymousParticipant(sessionId, participantId); res.status(204).end(); });
  // File uploads: prefer a raw octet-stream body (metadata in query) so browsers stream
  // the file from disk instead of materializing a giant base64 string in memory.
  // The legacy JSON contract ({ data: base64 }) is still accepted for older clients.
  app.post("/api/session/upload", express.raw({ limit: "150mb", type: "application/octet-stream" }), (req, res) => { try { let input: { sessionId: string; participantId: string; kind: "file"; name: string; mimeType?: string; size: number; data?: string }; if (Buffer.isBuffer(req.body)) { const q = req.query as Record<string, string | undefined>; input = { sessionId: String(q.sessionId || ""), participantId: String(q.participantId || ""), kind: "file", name: String(q.name || "file"), mimeType: String(q.mimeType || "application/octet-stream"), size: Number(q.size) || 0, data: req.body.length ? req.body.toString("base64") : "" }; } else { input = req.body; } const item = addAnonymousItem(input); res.json(item); } catch (error: any) { res.status(error?.code === "FORBIDDEN" ? 403 : 400).json({ message: error?.message || "Upload rejected" }); } });
  app.post("/api/session/download/start", (req, res) => { try { const { sessionId, participantId, itemId } = req.body ?? {}; const result = prepareAnonymousDownload({ sessionId: String(sessionId || ""), participantId: String(participantId || ""), itemId: String(itemId || "") }); res.json({ token: result.token, url: `/api/session/download?token=${encodeURIComponent(result.token)}` }); } catch (error: any) { const code = error?.code === "FORBIDDEN" ? 403 : error?.code === "NOT_FOUND" ? 404 : 400; res.status(code).json({ message: error?.message || "Download unavailable" }); } });
  app.get("/api/session/download/status", (req, res) => { try { res.json(getAnonymousDownload(String(req.query.token || ""))); } catch (error: any) { res.status(404).json({ message: error?.message || "Download status unavailable" }); } });
  app.post("/api/session/download/cancel", (req, res) => { try { const token = String(req.body?.token || ""); getAnonymousDownload(token); updateAnonymousDownload(token, "cancelled"); res.status(204).end(); } catch { res.status(404).end(); } });
  app.get("/api/session/download", (req, res) => { const token = String(req.query.token || ""); try { const record = getAnonymousDownload(token); const item = getAnonymousFile(record); const bytes = Buffer.from(item.data!, "base64"); const chunkSize = 64 * 1024; let offset = 0; res.setHeader("Content-Type", item.mimeType || "application/octet-stream"); res.setHeader("Content-Length", String(bytes.byteLength)); res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`); res.setHeader("Cache-Control", "private, no-store"); res.on("finish", () => { const current = getAnonymousDownload(token); if (current.status === "pending" && current.bytesSent >= bytes.byteLength) updateAnonymousDownload(token, "complete"); }); res.on("close", () => { try { const current = getAnonymousDownload(token); if (!res.writableFinished && current.status === "pending" && current.bytesSent < current.totalBytes) updateAnonymousDownload(token, "error"); } catch {} }); const writeChunk = () => { try { const current = getAnonymousDownload(token); if (current.status === "cancelled" || res.destroyed) { if (!res.writableEnded) res.end(); return; } const nextOffset = Math.min(offset + chunkSize, bytes.length); const canContinue = res.write(bytes.subarray(offset, nextOffset)); offset = nextOffset; updateAnonymousDownloadProgress(token, offset, bytes.length); if (offset >= bytes.length) { res.end(); return; } if (!canContinue) res.once("drain", writeChunk); else setImmediate(writeChunk); } catch { updateAnonymousDownload(token, "error"); if (!res.writableEnded) res.end(); } }; writeChunk(); } catch (error: any) { updateAnonymousDownload(token, "error"); const code = error?.code === "FORBIDDEN" ? 403 : error?.code === "NOT_FOUND" ? 404 : 400; res.status(code).json({ message: error?.message || "Download unavailable" }); } });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/` );
  });
}

startServer().catch(console.error);
