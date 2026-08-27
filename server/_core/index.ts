// deploy: library-wave3-asset-shelf
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { hydrateContentStore } from "../demoPlatform";
import { digestHandler } from "../scheduledDigest";
import { rateLimit, securityHeaders } from "./hardening";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // PERSIST2: load durable authoring overrides into the in-memory ContentStore
  // before serving (no-op when no DATABASE_URL). Never blocks startup on failure.
  await hydrateContentStore().catch((error) => console.warn("[ContentStore] hydration skipped:", error));
  // Security headers on every response (Phase 3 hardening). Safe/inert for the SPA;
  // HSTS + CSP (Report-Only by default) apply in production only.
  app.use(securityHeaders);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API — rate-limited per IP (generous; scoped here so storage/OAuth are untouched).
  app.use(
    "/api/trpc",
    rateLimit,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Scheduled callbacks (DELIVER4) — managed Heartbeat cron POSTs here. Must be
  // registered explicitly before the Vite/static fallthrough; /api/scheduled/* is
  // not auto-mounted.
  app.post("/api/scheduled/digest", digestHandler);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Bind the platform-assigned port directly on all interfaces. In a container
  // (Railway/etc.) PORT is injected and the app MUST bind exactly it on 0.0.0.0 —
  // binding localhost makes the app unreachable behind the platform proxy. The log
  // echoes the real host+port it bound, so the deploy log tells the truth.
  const host = "0.0.0.0";
  const port = Number(process.env.PORT) || 8080;

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch(console.error);
