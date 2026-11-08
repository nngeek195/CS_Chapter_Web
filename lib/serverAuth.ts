import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from './firebaseAdmin';

export interface Caller {
  uid: string;
  email: string;
  isAdmin: boolean;
  /** Permissions from member_access (empty for admins / non-members). */
  permissions: string[];
}

/**
 * Verifies the `Authorization: Bearer <Firebase ID token>` header and works out
 * who is calling, using the same model as the Firestore rules:
 *   - admin  = admins/{uid} exists
 *   - member = member_access/{email} exists (holds their permissions)
 * Returns the caller, or a NextResponse to send back on failure.
 */
export async function getCaller(req: NextRequest): Promise<Caller | NextResponse> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let uid = '';
  let email = '';
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = (decoded.email || '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session — please log in again' }, { status: 401 });
  }

  const db = getAdminDb();
  const [adminDoc, accessDoc] = await Promise.all([
    db.doc(`admins/${uid}`).get(),
    email ? db.doc(`member_access/${email}`).get() : Promise.resolve(null),
  ]);
  const permissions = accessDoc?.exists ? ((accessDoc.data()?.permissions as string[]) || []) : [];
  return { uid, email, isAdmin: adminDoc.exists, permissions };
}

export function can(caller: Caller, permission?: string): boolean {
  if (caller.isAdmin) return true;
  return permission ? caller.permissions.includes(permission) : caller.permissions.length > 0;
}

export const forbidden = (msg = 'You do not have permission to do this') =>
  NextResponse.json({ error: msg }, { status: 403 });
