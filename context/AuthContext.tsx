'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getBoardMemberByEmail, markPasswordChanged, subscribeToBoardMemberByEmail, isAdminUid, BoardMember } from '@/lib/firestore';

interface LoginResult {
  user: User;
  boardMember: BoardMember | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  mustChangePassword: boolean;
  /** If the logged-in user is a board member, this holds their record (permissions, role, etc.) */
  boardMember: BoardMember | null;
  /** True when the logged-in user is a full admin (i.e. NOT a board member) */
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  changePasswordAndActivate: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  mustChangePassword: false,
  boardMember: null,
  isAdmin: false,
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {},
  changePasswordAndActivate: async () => {},
});

function setAuthCookie(token: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `ieeecs_auth_token=${encodeURIComponent(
      token
    )}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie =
      'ieeecs_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  }
}

/** Store user role in a cookie so middleware can differentiate admin vs member */
function setRoleCookie(role: 'admin' | 'member') {
  if (typeof document !== 'undefined') {
    document.cookie = `ieeecs_user_role=${role}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function clearRoleCookie() {
  if (typeof document !== 'undefined') {
    document.cookie =
      'ieeecs_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [boardMember, setBoardMember] = useState<BoardMember | null>(null);
  // true/false = whether admins/{uid} exists; null = could not check (rules not deployed yet)
  const [adminFlag, setAdminFlag] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setAuthCookie(token);
        } catch (e) {
          console.warn('Failed to retrieve user token:', e);
        }
        // Resolve the board-member record BEFORE publishing the user. Otherwise
        // there is a render where user is set but boardMember is still null,
        // which makes the member portal think this is an admin and redirect.
        const bm = await getBoardMemberByEmail(currentUser.email || '');
        const adm = bm ? false : await isAdminUid(currentUser.uid);
        setRoleCookie(bm ? 'member' : 'admin');
        setAdminFlag(adm);
        setBoardMember(bm);
        setMustChangePassword(!!bm?.mustChangePassword);
        setUser(currentUser);
      } else {
        clearAuthCookie();
        clearRoleCookie();
        setUser(null);
        setBoardMember(null);
        setAdminFlag(null);
        setMustChangePassword(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Keep the board-member record live, so permission / role changes made by
  // an admin show up immediately without the member having to log in again.
  const memberEmail = boardMember ? user?.email || '' : '';
  useEffect(() => {
    if (!memberEmail) return;
    const unsub = subscribeToBoardMemberByEmail(memberEmail, (bm) => {
      if (!bm) {
        // Access was revoked — sign the member out.
        firebaseSignOut(auth).catch(() => {});
        return;
      }
      setBoardMember(bm);
      setMustChangePassword(!!bm.mustChangePassword);
    });
    return () => unsub();
  }, [memberEmail]);

  const login = async (email: string, pass: string): Promise<LoginResult> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const loggedUser = userCredential.user;
    const token = await loggedUser.getIdToken();
    setAuthCookie(token);

    // Determine role immediately so the cookie is set BEFORE any redirect.
    // Without this, middleware sees no role cookie and may allow wrong routes.
    const bm = await getBoardMemberByEmail(loggedUser.email || '');
    setAdminFlag(bm ? false : await isAdminUid(loggedUser.uid));
    setBoardMember(bm);
    if (bm) {
      setRoleCookie('member');
      setMustChangePassword(!!bm.mustChangePassword);
    } else {
      setRoleCookie('admin');
      setMustChangePassword(false);
    }

    setUser(loggedUser);
    return { user: loggedUser, boardMember: bm };
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    clearAuthCookie();
    clearRoleCookie();
    setUser(null);
    setBoardMember(null);
    setMustChangePassword(false);
  };

  const changePasswordAndActivate = async (newPassword: string) => {
    if (!user) throw new Error('No user logged in');
    await updatePassword(user, newPassword);
    await markPasswordChanged(user.email || '');
    setMustChangePassword(false);
    // Refresh board member state
    const bm = await getBoardMemberByEmail(user.email || '');
    setBoardMember(bm);
  };

  // An admin must have an admins/{uid} document. If that check could not run
  // (new Firestore rules not deployed yet) fall back to the old behaviour.
  // The Firestore rules are what actually enforce this.
  const isAdmin = !!user && !boardMember && adminFlag !== false;

  return (
    <AuthContext.Provider value={{ user, loading, mustChangePassword, boardMember, isAdmin, login, logout, changePasswordAndActivate }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
