// Object storage behind a provider seam (mirrors the AUTH_PROVIDER pattern).
//
// Default = Manus Forge (presigned PUT to S3 + presigned GET for retrieval), so the demo
// and the current deploy are completely unaffected. A direct S3 / Cloudflare R2 adapter
// activates ONLY when STORAGE_PROVIDER=s3 AND the S3_* keys are present; otherwise it
// falls back to Forge. The exported storagePut / storageGet / storageGetSignedUrl
// signatures are unchanged, so no call site changes. The AWS SDK (already a dependency)
// loads lazily — only when the S3 provider is actually invoked.

import { ENV } from "./_core/env";

export interface StorageResult {
  key: string;
  url: string;
}

export interface StorageProvider {
  readonly name: string;
  /** Store bytes at a hash-suffixed key; returns the stable key + retrieval path. */
  put(relKey: string, data: Buffer | Uint8Array | string, contentType?: string): Promise<StorageResult>;
  /** Resolve the retrieval path for an existing key (served via the /manus-storage proxy). */
  get(relKey: string): Promise<StorageResult>;
  /** A time-limited, directly-fetchable URL for the object (the proxy 307-redirects to it). */
  getSignedUrl(relKey: string): Promise<string>;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

// ── Forge provider (default) ──────────────────────────────────────────────────

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

export class ForgeStorageProvider implements StorageProvider {
  readonly name = "forge";

  async put(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<StorageResult> {
    const { forgeUrl, forgeKey } = getForgeConfig();
    const key = appendHashSuffix(normalizeKey(relKey));

    // 1. Get presigned PUT URL from Forge
    const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
    presignUrl.searchParams.set("path", key);
    const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
    if (!presignResp.ok) {
      const msg = await presignResp.text().catch(() => presignResp.statusText);
      throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
    }
    const { url: s3Url } = (await presignResp.json()) as { url: string };
    if (!s3Url) throw new Error("Forge returned empty presign URL");

    // 2. PUT file directly to S3
    const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
    const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
    if (!uploadResp.ok) throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);

    return { key, url: `/manus-storage/${key}` };
  }

  async get(relKey: string): Promise<StorageResult> {
    const key = normalizeKey(relKey);
    return { key, url: `/manus-storage/${key}` };
  }

  async getSignedUrl(relKey: string): Promise<string> {
    const { forgeUrl, forgeKey } = getForgeConfig();
    const key = normalizeKey(relKey);
    const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
    getUrl.searchParams.set("path", key);
    const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => resp.statusText);
      throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
    }
    const { url } = (await resp.json()) as { url: string };
    return url;
  }
}

// ── Direct S3 / Cloudflare R2 provider (opt-in) ───────────────────────────────

export interface S3Config {
  endpoint?: string; // set for R2/MinIO; omit for AWS S3
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** Read S3 config from env; null if the required keys are incomplete. */
export function readS3Config(): S3Config | null {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto", // R2 uses "auto"; AWS callers set S3_REGION
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";
  private clientPromise?: Promise<import("@aws-sdk/client-s3").S3Client>;

  constructor(private readonly cfg: S3Config) {}

  // Lazy so @aws-sdk/client-s3 is only loaded when S3 is actually used (Forge stays free).
  private client() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { S3Client } = await import("@aws-sdk/client-s3");
        return new S3Client({
          region: this.cfg.region,
          endpoint: this.cfg.endpoint,
          // Path-style addressing for R2/MinIO custom endpoints; virtual-hosted for AWS.
          forcePathStyle: Boolean(this.cfg.endpoint),
          credentials: { accessKeyId: this.cfg.accessKeyId, secretAccessKey: this.cfg.secretAccessKey },
        });
      })();
    }
    return this.clientPromise;
  }

  async put(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<StorageResult> {
    const key = appendHashSuffix(normalizeKey(relKey));
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    await client.send(new PutObjectCommand({ Bucket: this.cfg.bucket, Key: key, Body: data, ContentType: contentType }));
    // Retrieval flows through the same proxy path; getSignedUrl() presigns per-provider.
    return { key, url: `/manus-storage/${key}` };
  }

  async get(relKey: string): Promise<StorageResult> {
    const key = normalizeKey(relKey);
    return { key, url: `/manus-storage/${key}` };
  }

  async getSignedUrl(relKey: string): Promise<string> {
    const key = normalizeKey(relKey);
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await this.client();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }), { expiresIn: 3600 });
  }
}

// ── Selection + delegating exports (interface unchanged) ──────────────────────

/** Pick a provider from env. S3 only when STORAGE_PROVIDER=s3 AND its keys are present;
 *  otherwise Forge (the default), so the demo/current deploy are never affected. */
export function selectStorageProvider(): StorageProvider {
  if ((process.env.STORAGE_PROVIDER ?? "").toLowerCase() === "s3") {
    const cfg = readS3Config();
    if (cfg) return new S3StorageProvider(cfg);
    console.warn("[storage] STORAGE_PROVIDER=s3 but S3_* keys are incomplete; using Forge.");
  }
  return new ForgeStorageProvider();
}

let provider: StorageProvider | null = null;

/** The active provider, selected once from env. */
export function getStorageProvider(): StorageProvider {
  if (!provider) provider = selectStorageProvider();
  return provider;
}

/** Override / reset the provider (tests). */
export function __setStorageProvider(next: StorageProvider | null): void { provider = next; }

// Public API — identical signatures to before; delegate to the active provider.
export function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<StorageResult> {
  return getStorageProvider().put(relKey, data, contentType);
}
export function storageGet(relKey: string): Promise<StorageResult> {
  return getStorageProvider().get(relKey);
}
export function storageGetSignedUrl(relKey: string): Promise<string> {
  return getStorageProvider().getSignedUrl(relKey);
}
