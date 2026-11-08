import { auth } from './firebase';

/** Authorization header with the signed-in user's Firebase ID token (for our API routes). */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
