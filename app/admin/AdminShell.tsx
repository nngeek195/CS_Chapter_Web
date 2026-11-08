'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import FirstLoginModal from '@/components/FirstLoginModal';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { mustChangePassword, loading } = useAuth();

  return (
    <>
      {children}
      {!loading && mustChangePassword && <FirstLoginModal />}
    </>
  );
}
