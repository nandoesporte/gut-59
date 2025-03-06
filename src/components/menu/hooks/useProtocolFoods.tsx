
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProtocolFood } from "../types";

export const useProtocolFoods = () => {
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      setLoading(true);
      try {
        console.log("Iniciando busca de alimentos do protocolo...");
        
        const { data, error } = await supabase
          .from('protocol_foods')
          .select('*');

        if (error) {
          console.error('Erro ao buscar alimentos:', error);
          setError(error.message);
          toast.error("Erro ao carregar lista de alimentos");
          return;
        }

        console.log(`Dados recebidos: ${data?.length || 0} alimentos encontrados`);
        if (data && data.length > 0) {
          console.log("Exemplo de primeiro alimento:", data[0]);
        } else {
          console.log("Nenhum alimento encontrado na tabela protocol_foods");
        }
        
        setProtocolFoods(data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('Erro inesperado ao buscar alimentos:', err);
        setError(errorMessage);
        toast.error("Erro ao carregar alimentos");
      } finally {
        setLoading(false);
      }
    };

    fetchProtocolFoods();
  }, []);

  return { protocolFoods, loading, error };
};
