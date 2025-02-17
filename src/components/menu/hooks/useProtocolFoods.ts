
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProtocolFood } from "../types";

export const useProtocolFoods = () => {
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*, food_groups!fk_food_group(name)');

      if (error) {
        console.error('Error fetching foods:', error);
        toast.error("Erro ao carregar lista de alimentos");
        return;
      }

      setProtocolFoods(data);
    };

    fetchProtocolFoods();
  }, []);

  return { protocolFoods };
};
