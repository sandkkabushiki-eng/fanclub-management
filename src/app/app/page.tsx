'use client';

import { useState } from 'react';
import { AuthSession } from '@/types/auth';
import { authManager } from '@/lib/auth';
import FanClubDashboard from '@/components/FanClubDashboard';
import SecureAuth from '@/components/SecureAuth';

export default function AppPage() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  // セッション確認を完全に削除 - 常にログイン画面を表示

  const handleAuthenticated = (session: AuthSession) => {
    setAuthSession(session);
  };

  const handleLogout = async () => {
    await authManager.logout();
    setAuthSession(null);
  };

  if (!authSession) {
    return <SecureAuth onAuthenticated={handleAuthenticated} />;
  }

  return <FanClubDashboard authSession={authSession} onLogout={handleLogout} />;
}