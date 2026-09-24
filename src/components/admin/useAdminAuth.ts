import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export function useAdminAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setSession(s);
      // Any authenticated user is treated as admin (simplified auth)
      setIsAdmin(!!s);
      setChecking(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsAdmin(!!data.session);
      setChecking(false);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { session, isAdmin, checking };
}
