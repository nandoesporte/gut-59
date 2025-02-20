
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProtocolFood } from "../types";

export const useProtocolFoods = () => {
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      try {
        const { data, error } = await supabase
          .from('protocol_foods')
          .select('*');

        if (error) {
          console.error('Error fetching foods:', error);
          toast.error("Erro ao carregar lista de alimentos");
          return;
        }

        setProtocolFoods(data);
      } catch (err) {
        console.error('Error in fetchProtocolFoods:', err);
        toast.error("Erro ao carregar alimentos");
      }
    };

    fetchProtocolFoods();
  }, []);

  return protocolFoods;
};
