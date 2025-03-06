
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolFood } from "../types";

export const useProtocolFoods = () => {
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        setLoading(true);
        console.log("Fetching protocol foods from database...");
        
        const { data, error } = await supabase
          .from('protocol_foods')
          .select('*')
          .order('name');

        if (error) {
          throw new Error(`Error fetching foods: ${error.message}`);
        }

        console.log(`Fetched ${data?.length || 0} protocol foods`, data);
        setProtocolFoods(data || []);
      } catch (err) {
        console.error('Error in useProtocolFoods:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, []);

  return { protocolFoods, loading, error };
};
