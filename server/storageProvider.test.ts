import { afterEach, describe, expect, it } from "vitest";
import {
  ForgeStorageProvider, S3StorageProvider, readS3Config, selectStorageProvider,
} from "./storage";

// Storage provider seam — Forge is the default so the demo/current deploy are untouched;
// the direct S3/R2 adapter activates only when STORAGE_PROVIDER=s3 AND the keys are set.

const S3_KEYS = ["STORAGE_PROVIDER", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];

function setS3Env() {
  process.env.STORAGE_PROVIDER = "s3";
  process.env.S3_ENDPOINT = "https://acct.r2.cloudflarestorage.com";
  process.env.S3_REGION = "auto";
  process.env.S3_BUCKET = "enableos-assets";
  process.env.S3_ACCESS_KEY_ID = "AKIAEXAMPLE";
  process.env.S3_SECRET_ACCESS_KEY = "secretexample";
}

describe("storage provider selection", () => {
  afterEach(() => { for (const k of S3_KEYS) delete process.env[k]; });

  it("defaults to Forge when STORAGE_PROVIDER is unset", () => {
    const p = selectStorageProvider();
    expect(p).toBeInstanceOf(ForgeStorageProvider);
    expect(p.name).toBe("forge");
  });

  it("stays on Forge for STORAGE_PROVIDER=forge", () => {
    process.env.STORAGE_PROVIDER = "forge";
    expect(selectStorageProvider()).toBeInstanceOf(ForgeStorageProvider);
  });

  it("selects the S3/R2 adapter when STORAGE_PROVIDER=s3 and the keys are present", () => {
    setS3Env();
    const p = selectStorageProvider();
    expect(p).toBeInstanceOf(S3StorageProvider);
    expect(p.name).toBe("s3");
  });

  it("falls back to Forge when STORAGE_PROVIDER=s3 but keys are incomplete", () => {
    process.env.STORAGE_PROVIDER = "s3";
    process.env.S3_BUCKET = "enableos-assets"; // missing access key + secret
    expect(selectStorageProvider()).toBeInstanceOf(ForgeStorageProvider);
  });

  it("readS3Config returns a config only when all required keys are set", () => {
    expect(readS3Config()).toBeNull();
    setS3Env();
    const cfg = readS3Config();
    expect(cfg).toMatchObject({ bucket: "enableos-assets", region: "auto", endpoint: "https://acct.r2.cloudflarestorage.com" });
  });

  it("defaults region to 'auto' (R2) when S3_REGION is unset", () => {
    process.env.STORAGE_PROVIDER = "s3";
    process.env.S3_BUCKET = "b";
    process.env.S3_ACCESS_KEY_ID = "k";
    process.env.S3_SECRET_ACCESS_KEY = "s";
    expect(readS3Config()?.region).toBe("auto");
  });
});
