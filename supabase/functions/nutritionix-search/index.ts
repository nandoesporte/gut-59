
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NUTRITIONIX_APP_ID = Deno.env.get('NUTRITIONIX_APP_ID');
const NUTRITIONIX_API_KEY = Deno.env.get('NUTRITIONIX_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando busca Nutritionix");
    
    // Verificar se as chaves da API estão configuradas
    if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_API_KEY) {
      throw new Error("Chaves da API Nutritionix não configuradas");
    }

    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      throw new Error("É necessário fornecer um termo de busca válido");
    }

    console.log(`Buscando nutrição para: "${query}"`);
    
    // Chamada para a API Natural do Nutritionix (NLP)
    const response = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-id': NUTRITIONIX_APP_ID,
        'x-app-key': NUTRITIONIX_API_KEY
      },
      body: JSON.stringify({
        query: query,
        locale: 'pt_BR' // Usar português se disponível
      })
    });

    if (!response.ok) {
      // Tentar extrair informações de erro
      try {
        const errorData = await response.json();
        console.error("Erro da API Nutritionix:", errorData);
        throw new Error(`Erro na API Nutritionix: ${response.status} ${response.statusText}`);
      } catch (e) {
        throw new Error(`Erro na API Nutritionix: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    console.log(`Resultados encontrados: ${data.foods?.length || 0}`);

    // Fallback para a API de Pesquisa se não houver resultados
    if (!data.foods || data.foods.length === 0) {
      console.log("Sem resultados na API natural, tentando a API de pesquisa...");
      
      const searchResponse = await fetch(`https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`, {
        headers: {
          'x-app-id': NUTRITIONIX_APP_ID,
          'x-app-key': NUTRITIONIX_API_KEY
        }
      });
      
      if (!searchResponse.ok) {
        throw new Error(`Erro na API de pesquisa: ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      
      if (searchData.common && searchData.common.length > 0) {
        // Precisamos obter os detalhes nutricionais de cada item
        const commonFood = searchData.common[0];
        
        const detailsResponse = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-id': NUTRITIONIX_APP_ID,
            'x-app-key': NUTRITIONIX_API_KEY
          },
          body: JSON.stringify({
            query: commonFood.food_name
          })
        });
        
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          if (detailsData.foods && detailsData.foods.length > 0) {
            data.foods = detailsData.foods;
          }
        }
      }
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Erro na função nutritionix-search:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao consultar a API Nutritionix",
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
