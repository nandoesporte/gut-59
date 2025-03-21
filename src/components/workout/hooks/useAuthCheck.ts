
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserId(user?.id || null);
      
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
      
      console.log("Authentication status:", !!user, "User ID:", user?.id);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      setUserId(session?.user?.id || null);
      console.log("Auth state change:", event, !!session?.user);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { isAuthenticated, isAdmin, userId };
};
