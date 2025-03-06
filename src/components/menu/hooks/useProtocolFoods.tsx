
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolFood } from "../types";
import { toast } from "sonner";

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

        console.log(`Fetched ${data?.length || 0} protocol foods`);
        
        if (data?.length === 0) {
          console.warn("No protocol foods found in the database. Make sure to add some in the admin panel.");
          toast.warning("Nenhum alimento encontrado no banco de dados. Adicione alimentos no painel administrativo.");
        }
        
        // Log the meal types distribution for debugging
        if (data && data.length > 0) {
          const mealTypeCounts = data.reduce((acc: Record<string, number>, food) => {
            const group = food.food_group_id?.toString() || 'unknown';
            acc[group] = (acc[group] || 0) + 1;
            return acc;
          }, {});
          
          console.log("Foods by meal type:", mealTypeCounts);
        }
        
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
