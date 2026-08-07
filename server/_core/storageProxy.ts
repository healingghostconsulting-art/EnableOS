import type { Express } from "express";
import { storageGetSignedUrl } from "../storage";

// Serves /manus-storage/{key} by 307-redirecting to a per-provider presigned GET URL.
// Retrieval goes through the storage seam (storageGetSignedUrl), so this works for the
// Forge default AND the direct S3/R2 provider without any change here — the provider
// selected by env decides how the URL is signed. Behavior for Forge is unchanged (the
// seam presigns against Forge exactly as this proxy did inline).
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.path.replace(/^\/manus-storage\//, "");
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
