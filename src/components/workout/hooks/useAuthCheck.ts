
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get the current session which includes the access token
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        
        console.log("Auth check - Session:", !!session);
        
        // Get the current user
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
        
        if (user) {
          // Verificar se o usuário é admin (opcional)
          try {
            const { data } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .eq('role', 'admin')
              .maybeSingle();
            
            setIsAdmin(!!data);
          } catch (error) {
            console.error('Erro ao verificar papel de admin:', error);
            setIsAdmin(false);
          }
        }
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
      console.log("Auth state change:", event, !!session?.user);
      setIsAuthenticated(!!session?.user);
      setUserId(session?.user?.id || null);
      setAuthToken(session?.access_token || null);
      
      // When logging out, clear states
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { isAuthenticated, isAdmin, userId, authToken };
};
