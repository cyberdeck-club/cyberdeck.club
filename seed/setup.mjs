/**
 * cyberdeck.club post-seed setup script
 *
 * Configures a running EmDash instance via its admin API:
 *   1. Reads RESEND_API_KEY / RESEND_FROM_ADDRESS from .env and seeds them
 *      into the emdash-resend plugin's KV store via its configure route
 *   2. Activates emdash-resend as the email:deliver provider
 *   3. Adds common email domains for open self-registration
 *
 * Requires an admin API token with settings:manage permission.
 * Create one at: /_emdash/admin → Settings → API Tokens
 *
 * Usage:
 *   node seed/setup.mjs [--url https://your-site.com] [--token <api-token>] [--env .env]
 *
 * Environment variables (can replace flags):
 *   EMDASH_URL=https://your-site.com
 *   EMDASH_TOKEN=em_xxxxxxxxxx
 *
 * For Cloudflare Access-protected sites, also set:
 *   CF_ACCESS_CLIENT_ID=xxx.access
 *   CF_ACCESS_CLIENT_SECRET=yyy
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Arg parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] ?? null : null;
}

const BASE_URL = (getArg("--url") || process.env.EMDASH_URL || "http://localhost:4321").replace(/\/$/, "");
const TOKEN = getArg("--token") || process.env.EMDASH_TOKEN;
const ENV_FILE = getArg("--env") || ".env";

if (!TOKEN) {
  console.error("Error: No admin API token provided.");
  console.error("");
  console.error("Create one at: /_emdash/admin → Settings → API Tokens");
  console.error("Required scope: settings:manage");
  console.error("");
  console.error("Usage:");
  console.error("  node seed/setup.mjs --token em_xxx");
  console.error("  node seed/setup.mjs --url https://cyberdeck.club --token em_xxx");
  process.exit(1);
}

// ── .env parser ──────────────────────────────────────────────────────────────

function parseEnvFile(filePath) {
  const fullPath = resolve(filePath);
  if (!existsSync(fullPath)) return {};
  const contents = readFileSync(fullPath, "utf8");
  const vars = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const dotenv = parseEnvFile(ENV_FILE);
const RESEND_API_KEY = dotenv.RESEND_API_KEY || process.env.RESEND_API_KEY || "";
const RESEND_FROM_ADDRESS = dotenv.RESEND_FROM_ADDRESS || process.env.RESEND_FROM_ADDRESS || "";

// ── HTTP helper ──────────────────────────────────────────────────────────────

const CF_HEADERS = {};
if (process.env.CF_ACCESS_CLIENT_ID) CF_HEADERS["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
if (process.env.CF_ACCESS_CLIENT_SECRET) CF_HEADERS["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;

const HEADERS = {
  "Content-Type": "application/json",
  "X-EmDash-Request": "1",
  Authorization: `Bearer ${TOKEN}`,
  ...CF_HEADERS,
};

async function api(method, path, body) {
  const url = `${BASE_URL}/_emdash/api${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: HEADERS,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(`Network error reaching ${url}: ${err.message}`);
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, body: json };
}

// ── Domains to allow for open self-registration ──────────────────────────────

const ALLOWED_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "protonmail.com", "proton.me", "pm.me", "hey.com", "fastmail.com",
  "fastmail.fm", "tutanota.com", "tuta.com", "me.com", "live.com",
  "msn.com", "aol.com", "mail.com", "zoho.com", "duck.com",
];

// ── Steps ────────────────────────────────────────────────────────────────────

async function configureResend() {
  console.log("\n── Resend email credentials ─────────────────────────────");

  if (!RESEND_API_KEY) {
    console.warn("⚠ RESEND_API_KEY not found in .env — skipping Resend configuration");
    console.warn("  Set it in .env and re-run this script");
    return;
  }

  const res = await api("POST", "/plugins/emdash-resend/configure", {
    apiKey: RESEND_API_KEY,
    fromAddress: RESEND_FROM_ADDRESS || undefined,
  });

  if (res.ok) {
    console.log("✓ Resend API key stored in plugin KV");
    if (RESEND_FROM_ADDRESS) console.log(`  From: ${RESEND_FROM_ADDRESS}`);
  } else if (res.status === 403 || res.status === 401) {
    console.error(`✗ Permission denied (${res.status}) — check your token has settings:manage scope`);
    process.exit(1);
  } else {
    console.error("✗ Unexpected response:", res.status, JSON.stringify(res.body?.error || res.body));
  }
}

async function configureEmailProvider() {
  console.log("\n── Email provider selection ──────────────────────────────");
  const res = await api("PUT", "/admin/hooks/exclusive/email:deliver", {
    pluginId: "emdash-resend",
  });
  if (res.ok) {
    console.log("✓ emdash-resend selected as email:deliver provider");
  } else if (res.status === 400 && res.body?.error?.code === "VALIDATION_ERROR") {
    console.warn("⚠ emdash-resend not yet registered as email provider.");
    console.warn("  Make sure the dev server is fully started and try again.");
  } else if (res.status === 401 || res.status === 403) {
    console.error(`✗ Permission denied (${res.status}) — token needs settings:manage scope`);
    process.exit(1);
  } else {
    console.error("✗ Unexpected response:", res.status, JSON.stringify(res.body?.error || res.body));
  }
}

async function addAllowedDomains() {
  console.log("\n── Allowed domains (open self-registration) ─────────────");

  const listRes = await api("GET", "/admin/allowed-domains");
  const existing = new Set(
    listRes.ok ? (listRes.body?.data?.domains || []).map((d) => d.domain) : []
  );

  let added = 0, skipped = 0, failed = 0;

  for (const domain of ALLOWED_DOMAINS) {
    if (existing.has(domain)) { skipped++; continue; }
    const res = await api("POST", "/admin/allowed-domains", {
      domain,
      defaultRole: 10, // SUBSCRIBER
    });
    if (res.ok || res.status === 409) {
      added++;
    } else {
      console.error(`  ✗ ${domain}: ${res.status} ${JSON.stringify(res.body?.error)}`);
      failed++;
    }
  }

  if (added > 0) console.log(`✓ Added ${added} domain(s)`);
  if (skipped > 0) console.log(`  Skipped ${skipped} (already exist)`);
  if (failed > 0) console.warn(`⚠ ${failed} failed`);
  if (added === 0 && skipped === ALLOWED_DOMAINS.length) {
    console.log("  All domains already configured.");
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`cyberdeck.club setup`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Env file: ${resolve(ENV_FILE)}`);

  await configureResend();
  await configureEmailProvider();
  await addAllowedDomains();

  console.log("\n────────────────────────────────────────────────────────");
  console.log("Setup complete.");
  console.log("  • Email delivered via Resend (credentials stored in plugin KV)");
  console.log("  • Self-registration open for 20 common email domains");
}

main().catch((err) => {
  console.error("\nSetup failed:", err.message);
  process.exit(1);
});
