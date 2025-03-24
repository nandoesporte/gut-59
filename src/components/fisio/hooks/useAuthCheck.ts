
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get the current session which includes the access token
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        
        console.log("Fisio auth check - Session:", !!session);
        
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error checking authentication:", error);
          setIsAuthenticated(false);
          setUserId(null);
          setAuthToken(null);
          return;
        }
        
        setIsAuthenticated(!!user);
        setUserId(user?.id || null);
        setAuthToken(session?.access_token || null);
        console.log("Authentication status:", !!user, "User ID:", user?.id);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
        setUserId(null);
        setAuthToken(null);
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      setUserId(session?.user?.id || null);
      setAuthToken(session?.access_token || null);
      console.log("Auth state change:", event, !!session?.user);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { isAuthenticated, userId, authToken };
};
