import { auth } from './firebase';
import { authHeaders } from './authHeaders';

export interface InvitePayload {
  name: string;
  role: string;
  email: string;
  permissions: string[];
}

/**
 * Calls the invite API with the signed-in user's ID token (the API rejects
 * unauthenticated calls). Returns the one-time temporary password.
 */
export async function sendBoardInvite(payload: InvitePayload): Promise<{ tempPassword: string }> {
  if (!auth.currentUser) throw new Error('You are not signed in.');
  const res = await fetch('/api/invite-board-member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Invite failed (${res.status})`);
  return { tempPassword: data.tempPassword };
}
