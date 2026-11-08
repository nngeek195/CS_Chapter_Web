/**
 * Firebase Admin SDK — server-side only.
 *
 * Credentials are loaded from env vars:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 *
 * To get these values:
 *  1. Go to Firebase Console → Project Settings → Service Accounts
 *  2. Click "Generate new private key" and download the JSON file
 *  3. Copy the three values into .env.local (see the README or below)
 *
 * .env.local example:
 *   FIREBASE_ADMIN_PROJECT_ID=ieeecschaptersusl-e0484
 *   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxx@ieeecschaptersusl-e0484.iam.gserviceaccount.com
 *   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
 *
 * Proxy support:
 *   If the server runs behind an HTTP/HTTPS proxy, set HTTPS_PROXY (or
 *   https_proxy) in the environment. The Admin SDK will route all outbound
 *   requests through it automatically.
 */

import admin from 'firebase-admin';
import * as https from 'https';

// ── Proxy support ─────────────────────────────────────────────────────────────
// Firebase Admin SDK uses Node's https module under the hood but does NOT read
// the system HTTPS_PROXY env var automatically. We patch the global https agent
// so every outbound Admin SDK request (createUser, verifyToken, …) is routed
// through the proxy when one is configured.
function applyProxyIfNeeded(): void {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY  ||
    process.env.http_proxy;

  if (!proxyUrl) return;

  try {
    // https-proxy-agent is a transitive dep of firebase-admin — always present.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HttpsProxyAgent } = require('https-proxy-agent') as typeof import('https-proxy-agent');
    (https.globalAgent as any) = new HttpsProxyAgent(proxyUrl);
  } catch {
    // If the module is somehow absent, skip silently.
    console.warn('[firebaseAdmin] https-proxy-agent not found; proxy not applied.');
  }
}

applyProxyIfNeeded();

// ── App singleton ─────────────────────────────────────────────────────────────

function getAdminApp(): admin.app.App {
  // Return existing app if already initialised (hot-reload safe)
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK is not configured. ' +
      'Add FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and ' +
      'FIREBASE_ADMIN_PRIVATE_KEY to .env.local'
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

/** Firebase Admin Auth instance */
export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}

/** Firebase Admin Firestore instance */
export function getAdminDb(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}
