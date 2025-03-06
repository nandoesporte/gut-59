
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolFood } from "../types";
import { formatImageUrl } from "@/utils/imageUtils";

export const useProtocolFoods = () => {
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      try {
        console.log("Fetching protocol foods...");
        setLoading(true);
        
        // Log Supabase URL para diagnóstico
        console.log("Supabase URL:", supabase.supabaseUrl);
        
        const { data, error, status } = await supabase
          .from('protocol_foods')
          .select('*')
          .order('name');
        
        // Log informações de status e resposta para diagnóstico
        console.log("Query status:", status);
        
        if (error) {
          console.error('Erro ao buscar alimentos do protocolo:', error);
          toast.error(`Erro ao carregar opções de alimentos: ${error.message}`);
          setError(error.message);
          setLoading(false);
          return;
        }
        
        if (!data || data.length === 0) {
          console.warn('Nenhum alimento encontrado no banco de dados');
          // Define foods como um array vazio e finaliza loading
          setProtocolFoods([]);
          setLoading(false);
          return;
        }
        
        console.log(`Loaded ${data.length} protocol foods from database`);
        console.log("Sample food data:", data[0]);
        
        // Transform data to match ProtocolFood type and format image URLs
        const formattedFoods = data.map(food => {
          // Check if food has an image_url property and provide fallback
          let imageUrl = '/placeholder.svg';
          
          if (food && typeof food === 'object') {
            // Verifica se a propriedade image_url existe no objeto
            if ('image_url' in food && food.image_url) {
              imageUrl = formatImageUrl(food.image_url as string);
            }
          }
          
          return {
            ...food,
            image_url: imageUrl,
            id: food.id.toString(), // Ensure ID is a string for consistency
          };
        }) as ProtocolFood[];
        
        setProtocolFoods(formattedFoods);
        
        // Debug log food groups
        const foodGroups = [...new Set(formattedFoods.map(f => f.food_group_id))];
        console.log("Food groups found:", foodGroups);
        foodGroups.forEach(groupId => {
          const count = formattedFoods.filter(f => f.food_group_id === groupId).length;
          console.log(`Group ${groupId}: ${count} foods`);
        });
      } catch (error) {
        console.error('Erro ao processar alimentos do protocolo:', error);
        toast.error("Erro ao processar opções de alimentos");
        setError(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchProtocolFoods();
  }, []);

  return { protocolFoods, loading, error };
};
