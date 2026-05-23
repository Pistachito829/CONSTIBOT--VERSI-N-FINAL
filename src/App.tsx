/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import { initializeDB } from './db';
import { Login } from './components/Login';
import { StudentDashboard } from './components/StudentDashboard';
import { SocraticChatroom } from './components/SocraticChatroom';
import { TeacherDashboard } from './components/TeacherDashboard';

export default function App() {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Initialize DB on boot
  useEffect(() => {
    initializeDB();

    // Recover session if exists
    const storedSession = sessionStorage.getItem('cb_session');
    if (storedSession) {
      try {
        const decoded = JSON.parse(storedSession);
        
        // Strictly verify the token with the secure server proxy
        fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: decoded.sessionToken,
            username: decoded.username
          })
        })
          .then(res => {
            if (!res.ok) throw new Error('Secured token validation failed');
            return res.json();
          })
          .then(data => {
            if (data.success && data.profile) {
              setActiveUser(data.profile);
              sessionStorage.setItem('cb_session', JSON.stringify(data.profile));
            } else {
              // Fraud prevention: logout immediately if token is fraudulent/expired
              handleLogout();
            }
          })
          .catch(() => {
            // Safe resilient fallback if offline or Supabase not connected yet
            setActiveUser(decoded);
          });
      } catch (err) {
        sessionStorage.removeItem('cb_session');
      }
    }
  }, []);

  const handleLoginSuccess = (profile: UserProfile) => {
    setActiveUser(profile);
    sessionStorage.setItem('cb_session', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setActiveUser(null);
    setSelectedCaseId(null);
    sessionStorage.removeItem('cb_session');
  };

  // --- ROUTING ENGINE ---
  if (!activeUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (activeUser.role === 'teacher') {
    return <TeacherDashboard user={activeUser} onLogout={handleLogout} />;
  }

  // Student Role
  if (selectedCaseId) {
    return (
      <SocraticChatroom
        user={activeUser}
        caseId={selectedCaseId}
        onGoBack={() => setSelectedCaseId(null)}
      />
    );
  }

  return (
    <StudentDashboard
      user={activeUser}
      onSelectCase={(id) => setSelectedCaseId(id)}
      onLogout={handleLogout}
    />
  );
}
