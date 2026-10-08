/**
 * One-off: enables the Firestore API and creates the (default) database.
 * Run once: node scripts/firebase-firestore-init.mjs
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_ID = "catsino-casino";
const CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

const cfg = JSON.parse(
  readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8"),
);

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: cfg.tokens.refresh_token,
    grant_type: "refresh_token",
  }),
});
const { access_token: token } = await tokenRes.json();

async function api(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

// Enable Firestore API.
await api(
  `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/firestore.googleapis.com:enable`,
  { method: "POST" },
);
console.log("✓ Firestore API enabled (or already on)");

// Create the default database (idempotent-ish: 409 if it exists).
const create = await api(
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases?databaseId=(default)`,
  {
    method: "POST",
    body: JSON.stringify({
      locationId: "eur3",
      type: "FIRESTORE_NATIVE",
      concurrencyMode: "OPTIMISTIC",
    }),
  },
);
if (create.ok) console.log("✓ Firestore (default) database created in eur3");
else if (create.status === 409) console.log("✓ Firestore database already exists");
else console.log(`! Create returned ${create.status}: ${JSON.stringify(create.json)}`);
