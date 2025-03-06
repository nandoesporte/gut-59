
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolFood } from "../types";
import { toast } from "sonner";

// Definir o mapeamento de food_group_id para descrições legíveis
export const FOOD_GROUP_MAP = {
  1: 'Café da Manhã',
  2: 'Lanche da Manhã',
  3: 'Almoço',
  4: 'Lanche da Tarde',
  5: 'Jantar'
};

export const useProtocolFoods = () => {
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        setLoading(true);
        console.log("Fetching protocol foods from database...");
        
        // Buscar alimentos e dados de food_groups (para obter os nomes das categorias)
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
        
        // Processar os dados para garantir que todos os alimentos tenham food_group_id válido
        const processedData = data?.map(food => {
          // Garantir que os alimentos tenham categorias apropriadas
          if (food.food_group_id === null) {
            // Estratégia de categorização por nome de alimento
            const name = food.name.toLowerCase();
            
            // Café da manhã: alimentos típicos de café da manhã
            if (name.includes('café') || name.includes('pão') || name.includes('tapioca') || 
                name.includes('crepioca') || name.includes('cuscuz') || name.includes('leite') ||
                name.includes('queijo') || name.includes('iogurte') || name.includes('aveia')) {
              food.food_group_id = 1; // Café da Manhã
            } 
            // Lanches: frutas e lanches leves
            else if (name.includes('fruta') || name.includes('maçã') || name.includes('banana') ||
                     name.includes('snack') || name.includes('castanha') || name.includes('nozes')) {
              food.food_group_id = 2; // Lanche da Manhã
            }
            // Almoço/Jantar: proteínas e pratos principais
            else if (name.includes('arroz') || name.includes('feijão') || name.includes('carne') ||
                    name.includes('frango') || name.includes('peixe') || name.includes('legume') ||
                    name.includes('batata') || name.includes('massa')) {
              food.food_group_id = 3; // Almoço
            }
          }
          
          return food;
        });
        
        // Adicionar log para verificar a distribuição de alimentos por categoria
        if (processedData && processedData.length > 0) {
          const mealTypeCounts = processedData.reduce((acc: Record<string, number>, food) => {
            const groupId = food.food_group_id?.toString() || 'uncategorized';
            // Fix the type issue by ensuring groupId is a valid key for FOOD_GROUP_MAP
            // or defaulting to 'Não categorizado' if it's not
            const groupName = (groupId in FOOD_GROUP_MAP) 
              ? FOOD_GROUP_MAP[groupId as keyof typeof FOOD_GROUP_MAP] 
              : 'Não categorizado';
            
            acc[groupName] = (acc[groupName] || 0) + 1;
            return acc;
          }, {});
          
          console.log("Foods by meal type:", mealTypeCounts);
        }
        
        setProtocolFoods(processedData || []);
      } catch (err) {
        console.error('Error in useProtocolFoods:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        toast.error("Erro ao carregar alimentos. Por favor, tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, []);

  return { protocolFoods, loading, error };
};
