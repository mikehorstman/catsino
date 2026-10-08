/**
 * One-off bootstrap: mints an access token from the Firebase CLI's stored
 * refresh token, then creates a service account + JSON key for the Admin SDK.
 *
 * Run once: node scripts/firebase-setup.mjs
 * Output:   .secrets/firebase-service-account.json (gitignored)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_ID = "catsino-casino";
const SA_ID = "catsino-admin";
const SA_EMAIL = `${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com`;

const CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

const cfgPath = join(homedir(), ".config/configstore/firebase-tools.json");
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const refreshToken = cfg.tokens?.refresh_token;
if (!refreshToken) throw new Error("No refresh_token in firebase-tools config");

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function api(token, url, init = {}) {
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

const token = await getAccessToken();
console.log("✓ Access token acquired");

// 1. Ensure the IAM API is enabled.
await api(
  token,
  `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/iam.googleapis.com:enable`,
  { method: "POST" },
);
console.log("✓ IAM API enabled (or already on)");

// 2. Create the service account (idempotent).
const create = await api(
  token,
  `https://iam.googleapis.com/v1/projects/${PROJECT_ID}/serviceAccounts`,
  {
    method: "POST",
    body: JSON.stringify({
      accountId: SA_ID,
      serviceAccount: {
        displayName: "Catsino Admin SDK",
        description: "Server-side Firestore access for the Catsino app",
      },
    }),
  },
);
if (create.ok) console.log(`✓ Service account created: ${SA_EMAIL}`);
else if (create.status === 409)
  console.log(`✓ Service account already exists: ${SA_EMAIL}`);
else
  console.log(
    `! Service account create returned ${create.status}: ${JSON.stringify(create.json)}`,
  );

// 3. Grant Firestore + Firebase roles.
const ROLES = ["roles/datastore.user", "roles/firebase.sdkAdminServiceAgent"];
for (const role of ROLES) {
  const bind = await api(
    token,
    `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}:getIamPolicy`,
    { method: "POST", body: JSON.stringify({}) },
  );
  const policy = bind.json;
  policy.bindings = policy.bindings ?? [];
  let b = policy.bindings.find((x) => x.role === role);
  if (!b) {
    b = { role, members: [] };
    policy.bindings.push(b);
  }
  const member = `serviceAccount:${SA_EMAIL}`;
  if (!b.members.includes(member)) b.members.push(member);
  const set = await api(
    token,
    `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}:setIamPolicy`,
    { method: "POST", body: JSON.stringify({ policy }) },
  );
  console.log(
    set.ok ? `✓ Granted ${role}` : `! Grant ${role} -> ${set.status}`,
  );
}

// 4. Create a JSON key.
const key = await api(
  token,
  `https://iam.googleapis.com/v1/projects/${PROJECT_ID}/serviceAccounts/${SA_EMAIL}/keys`,
  {
    method: "POST",
    body: JSON.stringify({ keyAlgorithm: "KEY_ALG_RSA_2048" }),
  },
);
if (!key.ok)
  throw new Error(`Key creation failed: ${JSON.stringify(key.json)}`);

const decoded = Buffer.from(key.json.privateKeyData, "base64").toString("utf8");
const outDir = join(process.cwd(), ".secrets");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "firebase-service-account.json");
writeFileSync(outFile, decoded);
console.log(`✓ Service account key written to ${outFile}`);
