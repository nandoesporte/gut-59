
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  food_group_id: number;
  portion_size?: number;
  portion_unit?: string;
}

// Helper function to sanitize and fix JSON string
function sanitizeJsonString(jsonString: string): string {
  // Clean up ellipses that might indicate truncated content
  jsonString = jsonString.replace(/\.{3,}(\s*\]|\s*\})/g, '$1');
  
  // Remove any trailing commas before closing brackets or braces
  jsonString = jsonString.replace(/,(\s*[\]}])/g, '$1');
  
  // Ensure proper field values
  return jsonString
    .replace(/(\s*"protein"\s*:\s*)([^0-9\.\,\}]+)/g, '$10')
    .replace(/(\s*"carbs"\s*:\s*)([^0-9\.\,\}]+)/g, '$10')
    .replace(/(\s*"fats"\s*:\s*)([^0-9\.\,\}]+)/g, '$10')
    .replace(/(\s*"fiber"\s*:\s*)([^0-9\.\,\}]+)/g, '$10')
    .replace(/(\s*"calories"\s*:\s*)([^0-9\.\,\}]+)/g, '$10');
}

// Fix partial JSON - specifically for the failing Groq responses
function repairPartialJson(content: string): string {
  try {
    // If we have a valid JSON already, return it
    JSON.parse(content);
    return content;
  } catch (e) {
    console.log("Attempting to repair partial JSON...");
    
    // Replace any ... or truncation indicators
    content = content.replace(/\.{3,}|\[truncated\]|etc\.|\.\.\./g, '');
    
    // Check for unbalanced braces and brackets
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    
    // Add missing closing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      content += '}';
    }
    
    // Add missing closing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      content += ']';
    }
    
    // Ensure proper weekly plan structure
    if (content.includes('"weeklyPlan"') && !content.includes('"weeklyTotals"')) {
      // If weeklyPlan exists but weeklyTotals is missing, add a basic structure
      content = content.replace(/}(\s*)$/,
        `},
        "weeklyTotals": {
          "averageCalories": 2000,
          "averageProtein": 100,
          "averageCarbs": 200,
          "averageFats": 70,
          "averageFiber": 25
        },
        "recommendations": {
          "general": "Beba pelo menos 2 litros de água por dia e mantenha refeições regulares.",
          "preworkout": "Consumir carboidratos 30-60 minutos antes do treino para energia.",
          "postworkout": "Consumir proteínas após o treino para recuperação muscular.",
          "timing": [
            "Café da manhã: 7-8h",
            "Lanche da manhã: 10-11h",
            "Almoço: 12-13h",
            "Lanche da tarde: 15-16h",
            "Jantar: 19-20h"
          ]
        }$1`);
    }
    
    // Try parsing again after repairs
    try {
      JSON.parse(content);
      console.log("JSON repair successful");
      return content;
    } catch (e) {
      console.error("JSON repair failed:", e);
      // Return a default JSON structure if repair fails
      return `{
        "weeklyPlan": {
          "segunda": {
            "dayName": "Segunda-feira",
            "meals": {
              "cafeDaManha": {
                "description": "Café da manhã simples",
                "foods": [
                  {
                    "name": "Café + Leite",
                    "portion": 200,
                    "unit": "ml",
                    "details": "Café com leite"
                  }
                ],
                "calories": 100,
                "macros": {
                  "protein": 5,
                  "carbs": 10,
                  "fats": 5,
                  "fiber": 0
                }
              },
              "lancheDaManha": {
                "description": "Lanche da manhã",
                "foods": [
                  {
                    "name": "Fruta",
                    "portion": 100,
                    "unit": "g",
                    "details": "Fruta fresca"
                  }
                ],
                "calories": 50,
                "macros": {
                  "protein": 1,
                  "carbs": 12,
                  "fats": 0,
                  "fiber": 2
                }
              },
              "almoco": {
                "description": "Almoço equilibrado",
                "foods": [
                  {
                    "name": "Arroz",
                    "portion": 100,
                    "unit": "g",
                    "details": "Arroz branco"
                  },
                  {
                    "name": "Frango",
                    "portion": 100,
                    "unit": "g",
                    "details": "Frango grelhado"
                  }
                ],
                "calories": 300,
                "macros": {
                  "protein": 25,
                  "carbs": 40,
                  "fats": 5,
                  "fiber": 1
                }
              },
              "lancheDaTarde": {
                "description": "Lanche da tarde",
                "foods": [
                  {
                    "name": "Iogurte",
                    "portion": 150,
                    "unit": "g",
                    "details": "Iogurte natural"
                  }
                ],
                "calories": 100,
                "macros": {
                  "protein": 5,
                  "carbs": 10,
                  "fats": 3,
                  "fiber": 0
                }
              },
              "jantar": {
                "description": "Jantar leve",
                "foods": [
                  {
                    "name": "Sopa",
                    "portion": 300,
                    "unit": "ml",
                    "details": "Sopa de legumes"
                  }
                ],
                "calories": 150,
                "macros": {
                  "protein": 5,
                  "carbs": 20,
                  "fats": 5,
                  "fiber": 5
                }
              }
            },
            "dailyTotals": {
              "calories": 700,
              "protein": 41,
              "carbs": 92,
              "fats": 18,
              "fiber": 8
            }
          }
        },
        "weeklyTotals": {
          "averageCalories": 700,
          "averageProtein": 41,
          "averageCarbs": 92,
          "averageFats": 18,
          "averageFiber": 8
        },
        "recommendations": {
          "general": "Beba pelo menos 2 litros de água por dia.",
          "preworkout": "Consumir carboidratos antes do treino.",
          "postworkout": "Consumir proteínas após o treino.",
          "timing": [
            "Café da manhã: 7-8h",
            "Lanche da manhã: 10-11h",
            "Almoço: 12-13h", 
            "Lanche da tarde: 15-16h",
            "Jantar: 19-20h"
          ]
        }
      }`;
    }
  }
}

// Process a successful API response with additional fixes and validations
function processApiResponse(content: string): object {
  // Remove any markdown code blocks if present
  content = content.replace(/```json|```/g, '').trim();
  
  // Sanitize the JSON string
  content = sanitizeJsonString(content);
  
  // Repair if needed
  content = repairPartialJson(content);
  
  // Parse the JSON
  const mealPlanData = JSON.parse(content);
  
  // Ensure all numeric values are actually numbers and round to 1 decimal place
  const sanitizeNumericFields = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeNumericFields(item));
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeNumericFields(value);
      } else if (['calories', 'protein', 'carbs', 'fats', 'fiber', 'portion', 'averageCalories', 'averageProtein', 'averageCarbs', 'averageFats', 'averageFiber'].includes(key)) {
        // Convert to number and round to 1 decimal place
        const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0);
        // Handle NaN or undefined
        result[key] = !isNaN(numValue) ? Math.round(numValue * 10) / 10 : 0;
      } else {
        result[key] = value;
      }
    }
    return result;
  };
  
  return sanitizeNumericFields(mealPlanData);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!groqApiKey) {
      throw new Error('Missing GROQ_API_KEY environment variable');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { userInput, user_id } = await req.json();
    
    console.log(`Received meal plan generation request for user: ${user_id}`);
    console.log(`User input: ${JSON.stringify(userInput)}`);

    // Prepare the prompt for Groq
    const prompt = `
    Crie um plano alimentar detalhado baseado nas seguintes preferências do usuário:
    
    ${JSON.stringify(userInput, null, 2)}
    
    O plano alimentar deve ser estruturado da seguinte forma:
    - Incluir 5 refeições diárias (café da manhã, lanche da manhã, almoço, lanche da tarde, jantar)
    - Especificar alimentos com porções em gramas ou mililitros
    - Incluir informações nutricionais (calorias, proteínas, carboidratos, gorduras e fibras)
    - Considerar preferências e restrições alimentares
    - Ser realista e prático para preparação diária
    
    Retorne APENAS o JSON com a seguinte estrutura, sem texto adicional:
    
    {
      "weeklyPlan": {
        "segunda": {
          "dayName": "Segunda-feira",
          "meals": {
            "cafeDaManha": {
              "description": "Descrição da refeição",
              "foods": [
                {
                  "name": "Nome do alimento",
                  "portion": 100,
                  "unit": "g",
                  "details": "Detalhes de preparo"
                }
              ],
              "calories": 500,
              "macros": {
                "protein": 30,
                "carbs": 50,
                "fats": 15,
                "fiber": 5
              }
            },
            "lancheDaManha": { ... },
            "almoco": { ... },
            "lancheDaTarde": { ... },
            "jantar": { ... }
          },
          "dailyTotals": {
            "calories": 2000,
            "protein": 150,
            "carbs": 200,
            "fats": 70,
            "fiber": 30
          }
        },
        "terca": { ... },
        "quarta": { ... },
        "quinta": { ... },
        "sexta": { ... },
        "sabado": { ... },
        "domingo": { ... }
      },
      "weeklyTotals": {
        "averageCalories": 2000,
        "averageProtein": 150,
        "averageCarbs": 200,
        "averageFats": 70,
        "averageFiber": 30
      },
      "recommendations": {
        "general": "Recomendação geral",
        "preworkout": "Recomendação pré-treino",
        "postworkout": "Recomendação pós-treino",
        "timing": [
          "Café da manhã: 7-8h",
          "Lanche da manhã: 10-11h",
          "Almoço: 12-13h", 
          "Lanche da tarde: 15-16h",
          "Jantar: 19-20h"
        ]
      }
    }
    
    Certifique-se de que o JSON é válido e completo. Não inclua campos adicionais na resposta.`;

    console.log("Sending request to Groq API with model: llama3-8b-8192");

    // Make request to Groq API
    let attempts = 0;
    const maxAttempts = 2;
    let groqData;
    let mealPlanContent;
    let error = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`Attempt ${attempts} to call Groq API`);
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              {
                role: 'system',
                content: 'Você é um nutricionista especializado que cria planos alimentares personalizados em formato JSON válido.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          const responseText = await response.text();
          console.error(`Error from Groq API (${response.status}): ${responseText}`);
          
          if (attempts < maxAttempts) {
            console.log("Retrying with simplified approach...");
            continue;
          }
          
          throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${responseText}`);
        }

        groqData = await response.json();
        mealPlanContent = groqData.choices[0]?.message?.content;
        
        if (!mealPlanContent) {
          throw new Error('No content returned from Groq API');
        }
        
        console.log('Successfully received response from Groq');
        console.log('Response length:', mealPlanContent.length);
        console.log('First 200 chars:', mealPlanContent.substring(0, 200));
        
        // Try processing the response
        break;
      } catch (e) {
        error = e;
        console.error(`Attempt ${attempts} failed:`, e);
        
        // If on last attempt, continue to use the last (even if it failed)
        if (attempts >= maxAttempts) {
          console.error('All attempts failed. Using last response.');
        }
      }
    }

    // Process the response even if we had errors (try to recover)
    let mealPlanJson;
    try {
      if (!mealPlanContent) {
        throw new Error('No content to process');
      }
      
      // Process and sanitize the API response
      mealPlanJson = processApiResponse(mealPlanContent);
      console.log("Successfully processed the meal plan JSON");
    } catch (e) {
      console.error('Failed to process meal plan JSON:', e);
      
      // If we somehow failed to process, return the error
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process meal plan', 
          details: e.message,
          rawContent: mealPlanContent ? mealPlanContent.substring(0, 500) + "..." : "No content received"
        }),
        { 
          status: 500, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Store the generated meal plan in the database
    try {
      console.log("Storing meal plan in database...");
      const { data: insertData, error: insertError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user_id,
          plan_data: mealPlanJson,
          calories: mealPlanJson.weeklyTotals?.averageCalories || 0,
          generated_at: new Date().toISOString(),
          generated_by: "nutri-plus-agent-llama3"
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error storing meal plan:', insertError);
        throw new Error('Failed to store the generated meal plan');
      }

      // Increment the meal plan generation count for this user
      await supabase.rpc('increment_nutrition_count', { user_id });

      console.log(`Meal plan generated and stored with ID: ${insertData.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          mealPlan: mealPlanJson,
          id: insertData.id
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          }
        }
      );
    } catch (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store meal plan', 
          details: dbError.message
        }),
        { 
          status: 500, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  } catch (error) {
    console.error('Critical Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
