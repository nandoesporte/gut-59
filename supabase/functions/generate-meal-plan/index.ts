import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { calculateDailyCalories } from "./calculators.ts";
import { validateInput } from "./validator.ts";
import { generateRecommendations } from "./recommendations.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const groqApiKey = Deno.env.get('GROQ_API_KEY');
// Configurar chaves da API Nutritionix
const NUTRITIONIX_APP_ID = Deno.env.get('NUTRITIONIX_APP_ID') || "75c8c0ea";
const NUTRITIONIX_API_KEY = Deno.env.get('NUTRITIONIX_API_KEY') || "636f7a3146b09d140b5353ef030fb2a4";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log("Dados recebidos:", JSON.stringify(requestBody));

    const { userData, selectedFoods, dietaryPreferences } = requestBody;

    // Validação dos dados de entrada
    const validationResult = validateInput(userData, selectedFoods, dietaryPreferences);
    if (validationResult.errors) {
      console.error("Erro de validação:", validationResult.errors);
      return new Response(
        JSON.stringify({ error: "Dados de entrada inválidos", details: validationResult.errors }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Cálculo das necessidades calóricas diárias
    const dailyCalories = calculateDailyCalories(userData);
    console.log("Calorias diárias calculadas:", dailyCalories);

    // Construir o prompt para o modelo de linguagem
    const prompt = `
    Você é um nutricionista especializado em criar planos alimentares personalizados.
    Com base nas informações fornecidas pelo usuário, gere um plano alimentar detalhado para uma semana.

    Informações do Usuário:
    - Peso: ${userData.weight} kg
    - Altura: ${userData.height} cm
    - Idade: ${userData.age} anos
    - Gênero: ${userData.gender}
    - Nível de Atividade: ${userData.activityLevel}
    - Objetivo: ${userData.goal}
    - Necessidades Calóricas Diárias: ${dailyCalories} kcal

    Preferências Alimentares:
    - Alergias: ${dietaryPreferences.allergies.length > 0 ? dietaryPreferences.allergies.join(", ") : "Nenhuma"}
    - Restrições Alimentares: ${dietaryPreferences.dietaryRestrictions.length > 0 ? dietaryPreferences.dietaryRestrictions.join(", ") : "Nenhuma"}
    - Tempo de Treino: ${dietaryPreferences.trainingTime || "Não especificado"}

    Alimentos Selecionados:
    ${selectedFoods.map(food => `- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`).join("\n")}

    Instruções Adicionais:
    1. Crie um plano alimentar para 7 dias (segunda a domingo).
    2. Inclua café da manhã, lanche da manhã, almoço, lanche da tarde e jantar.
    3. Varie os alimentos ao longo da semana para garantir uma dieta equilibrada.
    4. Ajuste as porções para atingir as necessidades calóricas diárias do usuário.
    5. Forneça recomendações gerais sobre nutrição, horários de refeições e o que comer antes e depois do treino.
    6. O plano deve ser apresentado em formato JSON.
    7. O plano deve incluir o nome do dia da semana.
    8. O plano deve incluir as calorias e macros totais por dia.
    9. O plano deve incluir as calorias e macros totais por refeição.
    10. O plano deve incluir a quantidade de fibra por refeição e no total do dia.
    11. O plano deve incluir recomendações de horários de refeições.
    12. O plano deve incluir recomendações do que comer antes e depois do treino.
    13. O plano deve incluir recomendações gerais sobre nutrição.
    14. O plano deve incluir o nome de cada refeição.
    15. O plano deve incluir uma descrição para cada refeição.
    16. O plano deve incluir detalhes sobre cada alimento, incluindo a porção e a unidade de medida.
    17. O plano deve incluir o nome dos alimentos.
    18. O plano deve incluir o ID dos alimentos.
    19. O plano deve incluir o ID do grupo alimentar.
    20. O plano deve incluir dados do nutritionix, como serving_unit, serving_qty e serving_weight_grams.

    Formato de Resposta:
    {
      "weeklyPlan": {
        "monday": {
          "dayName": "Monday",
          "meals": {
            "breakfast": {
              "name": "Café da Manhã",
              "description": "Refeição para começar o dia com energia.",
              "foods": [
                {
                  "name": "Omelete",
                  "portion": 2,
                  "unit": "unidades",
                  "details": "Omelete com queijo e tomate."
                }
              ],
              "calories": 300,
              "macros": {
                "protein": 20,
                "carbs": 10,
                "fats": 20,
                "fiber": 5
              }
            },
            "morningSnack": {
              "name": "Lanche da Manhã",
              "description": "Pequena refeição para manter a energia.",
              "foods": [
                {
                  "name": "Maçã",
                  "portion": 1,
                  "unit": "unidade",
                  "details": "Maçã média."
                }
              ],
              "calories": 100,
              "macros": {
                "protein": 1,
                "carbs": 25,
                "fats": 0,
                "fiber": 4
              }
            },
            "lunch": {
              "name": "Almoço",
              "description": "Refeição principal do dia.",
              "foods": [
                {
                  "name": "Salada de Frango",
                  "portion": 200,
                  "unit": "gramas",
                  "details": "Salada de frango com legumes."
                }
              ],
              "calories": 400,
              "macros": {
                "protein": 30,
                "carbs": 20,
                "fats": 20,
                "fiber": 8
              }
            },
            "afternoonSnack": {
              "name": "Lanche da Tarde",
              "description": "Pequena refeição para evitar a fome.",
              "foods": [
                {
                  "name": "Iogurte",
                  "portion": 1,
                  "unit": "pote",
                  "details": "Iogurte natural."
                }
              ],
              "calories": 150,
              "macros": {
                "protein": 10,
                "carbs": 15,
                "fats": 5,
                "fiber": 0
              }
            },
            "dinner": {
              "name": "Jantar",
              "description": "Refeição leve para a noite.",
              "foods": [
                {
                  "name": "Sopa de Legumes",
                  "portion": 300,
                  "unit": "ml",
                  "details": "Sopa de legumes variados."
                }
              ],
              "calories": 250,
              "macros": {
                "protein": 10,
                "carbs": 30,
                "fats": 5,
                "fiber": 10
              }
            }
          },
          "dailyTotals": {
            "calories": 1200,
            "protein": 71,
            "carbs": 100,
            "fats": 50,
            "fiber": 27
          }
        },
        "tuesday": {
          "dayName": "Tuesday",
          "meals": {
            "breakfast": {
              "name": "Café da Manhã",
              "description": "Refeição para começar o dia com energia.",
              "foods": [
                {
                  "name": "Omelete",
                  "portion": 2,
                  "unit": "unidades",
                  "details": "Omelete com queijo e tomate."
                }
              ],
              "calories": 300,
              "macros": {
                "protein": 20,
                "carbs": 10,
                "fats": 20,
                "fiber": 5
              }
            },
            "morningSnack": {
              "name": "Lanche da Manhã",
              "description": "Pequena refeição para manter a energia.",
              "foods": [
                {
                  "name": "Maçã",
                  "portion": 1,
                  "unit": "unidade",
                  "details": "Maçã média."
                }
              ],
              "calories": 100,
              "macros": {
                "protein": 1,
                "carbs": 25,
                "fats": 0,
                "fiber": 4
              }
            },
            "lunch": {
              "name": "Almoço",
              "description": "Refeição principal do dia.",
              "foods": [
                {
                  "name": "Salada de Frango",
                  "portion": 200,
                  "unit": "gramas",
                  "details": "Salada de frango com legumes."
                }
              ],
              "calories": 400,
              "macros": {
                "protein": 30,
                "carbs": 20,
                "fats": 20,
                "fiber": 8
              }
            },
            "afternoonSnack": {
              "name": "Lanche da Tarde",
              "description": "Pequena refeição para evitar a fome.",
              "foods": [
                {
                  "name": "Iogurte",
                  "portion": 1,
                  "unit": "pote",
                  "details": "Iogurte natural."
                }
              ],
              "calories": 150,
              "macros": {
                "protein": 10,
                "carbs": 15,
                "fats": 5,
                "fiber": 0
              }
            },
            "dinner": {
              "name": "Jantar",
              "description": "Refeição leve para a noite.",
              "foods": [
                {
                  "name": "Sopa de Legumes",
                  "portion": 300,
                  "unit": "ml",
                  "details": "Sopa de legumes variados."
                }
              ],
              "calories": 250,
              "macros": {
                "protein": 10,
                "carbs": 30,
                "fats": 5,
                "fiber": 10
              }
            }
          },
          "dailyTotals": {
            "calories": 1200,
            "protein": 71,
            "carbs": 100,
            "fats": 50,
            "fiber": 27
          }
        },
        "wednesday": {
          "dayName": "Wednesday",
          "meals": {
            "breakfast": {
              "name": "Café da Manhã",
              "description": "Refeição para começar o dia com energia.",
              "foods": [
                {
                  "name": "Omelete",
                  "portion": 2,
                  "unit": "unidades",
                  "details": "Omelete com queijo e tomate."
                }
              ],
              "calories": 300,
              "macros": {
                "protein": 20,
                "carbs": 10,
                "fats": 20,
                "fiber": 5
              }
            },
            "morningSnack": {
              "name": "Lanche da Manhã",
              "description": "Pequena refeição para manter a energia.",
              "foods": [
                {
                  "name": "Maçã",
                  "portion": 1,
                  "unit": "unidade",
                  "details": "Maçã média."
                }
              ],
              "calories": 100,
              "macros": {
                "protein": 1,
                "carbs": 25,
                "fats": 0,
                "fiber": 4
              }
            },
            "lunch": {
              "name": "Almoço",
              "description": "Refeição principal do dia.",
              "foods": [
                {
                  "name": "Salada de Frango",
                  "portion": 200,
                  "unit": "gramas",
                  "details": "Salada de frango com legumes."
                }
              ],
              "calories": 400,
              "macros": {
                "protein": 30,
                "carbs": 20,
                "fats": 20,
                "fiber": 8
              }
            },
            "afternoonSnack": {
              "name": "Lanche da Tarde",
              "description": "Pequena refeição para evitar a fome.",
              "foods": [
                {
                  "name": "Iogurte",
                  "portion": 1,
                  "unit": "pote",
                  "details": "Iogurte natural."
                }
              ],
              "calories": 150,
              "macros": {
                "protein": 10,
                "carbs": 15,
                "fats": 5,
                "fiber": 0
              }
            },
            "dinner": {
              "name": "Jantar",
              "description": "Refeição leve para a noite.",
              "foods": [
                {
                  "name": "Sopa de Legumes",
                  "portion": 300,
                  "unit": "ml",
                  "details": "Sopa de legumes variados."
                }
              ],
              "calories": 250,
              "macros": {
                "protein": 10,
                "carbs": 30,
                "fats": 5,
                "fiber": 10
              }
            }
          },
          "dailyTotals": {
            "calories": 1200,
            "protein": 71,
            "carbs": 100,
            "fats": 50,
            "fiber": 27
          }
        },
        "thursday": {
          "dayName": "Thursday",
          "meals": {
            "breakfast": {
              "name": "Café da Manhã",
              "description": "Refeição para começar o dia com energia.",
              "foods": [
                {
                  "name": "Omelete",
                  "portion": 2,
                  "unit": "unidades",
                  "details": "Omelete com queijo e tomate."
                }
              ],
              "calories": 300,
              "macros": {
                "protein": 20,
                "carbs": 10,
                "fats": 20,
                "fiber": 5
              }
            },
            "morningSnack": {
              "name": "Lanche da Manhã",
              "description": "Pequena refeição para manter a energia.",
              "foods": [
                {
                  "name": "Maçã",
                  "portion": 1,
                  "unit": "unidade",
                  "details": "Maçã média."
                }
              ],
              "calories": 100,
              "macros": {
                "protein": 1,
                "carbs": 25,
                "fats": 0,
                "fiber": 4
              }
            },
            "lunch": {
              "name": "Almoço",
              "description": "Refeição principal do dia.",
              "foods": [
                {
                  "name": "Salada de Frango",
                  "portion": 200,
                  "unit": "gramas",
                  "details": "Salada de frango com legumes."
                }
              ],
              "calories": 400,
              "macros": {
                "protein": 30,
                "carbs": 20,
                "fats": 20,
                "fiber": 8
              }
            },
            "afternoonSnack": {
              "name": "Lanche da Tarde",
              "description": "Pequena refeição para evitar a fome.",
              "foods": [
                {
                  "name": "Iogurte",
                  "portion": 1,
                  "unit": "pote",
                  "details": "Iogurte natural."
                }
              ],
              "calories": 150,
              "macros": {
                "protein": 10,
                "carbs": 15,
                "fats": 5,
                "fiber": 0
              }
            },
            "dinner": {
              "name": "Jantar",
              "description": "Refeição leve para a noite.",
              "foods": [
                {
                  "name": "Sopa de Legumes",
                  "portion": 300,
                  "unit": "ml",
                  "details": "Sopa de legumes variados."
                }
              ],
              "calories": 250,
              "macros": {
                "protein": 10,
                "carbs": 30,
                "fats": 5,
                "fiber": 10
              }
            }
          },
          "dailyTotals": {
            "calories": 1200,
            "protein": 71,
            "carbs": 100,
            "fats": 50,
            "fiber": 27
          }
        },
        "friday": {
          "dayName": "Friday",
          "meals": {
            "breakfast": {
              "name": "Café da Manhã",
              "description": "Refeição para começar o dia com energia.",
              "foods": [
                {
                  "name": "Omelete",
                  "portion": 2,
                  "unit": "unidades",
                  "details": "Omelete com queijo e tomate."
                }
              ],
              "calories": 300,
              "macros": {
                "protein": 20,
                "carbs": 10,
                "fats": 20,
                "fiber": 5
              }
            },
            "morningSnack": {
              "name": "Lanche da Manhã",
              "description": "Pequena refeição para manter a energia.",
              "foods": [
                {
                  "name": "Maçã",
                  "portion": 1,
                  "unit": "unidade",
                  "details": "Maçã média."
                }
              ],
              "calories": 100,
              "macros": {
                "protein": 1,
                "carbs": 25,
                "fats": 0,
                "fiber": 4
              }
            },
            "lunch": {
              "name": "Almoço",
              "description": "Refeição principal do dia.",
              "foods": [
                {
                  "name": "Salada de Frango",
                  "portion": 200,
                  "unit": "gramas",
                  "details": "Salada de frango com legumes."
                }
              ],
              "calories": 400,
              "macros": {
                "protein": 30,
                "carbs": 20,
                "fats": 20,
                "fiber": 8
              }
            },
            "afternoonSnack": {
              "name": "Lanche da Tarde",
              "description": "Pequena refeição para evitar a fome.",
              "foods": [
                {
                  "name": "Iogurte",
                  "portion": 1,
                  "unit": "pote",
                  "details": "Iogurte natural."
                }
              ],
              "calories": 150,
              "macros": {
                "protein": 10,
                "carbs": 15,
                "fats": 5,
                "fiber": 0
              }
            },
            "dinner": {
              "name": "Jantar",
              "description": "Refeição leve para a noite.",
              "foods": [
                {
                  "name": "Sopa de Legumes",
                  "portion": 300,
                  "unit": "ml",
                  "details": "Sopa de legumes variados."
                }
              ],
              "calories": 250,
              "macros": {
                "protein": 10,
                "carbs": 30,
                "fats": 5,
                "fiber": 10
              }
            }
          },
          "dailyTotals": {
            "calories": 1200,
            "protein": 71,
            "carbs": 100,
            "fats": 50,
            "fiber": 27
          }
        },
        "saturday": {
          "dayName": "Saturday",
          "meals": {
            "breakfast": {
              "name": "Café da Manhã",
              "description": "Refeição para começar o dia com energia.",
              "foods": [
                {
                  "name": "Omelete",
                  "portion": 2,
                  "unit": "unidades",
                  "details": "Omelete com queijo e tomate."
                }
              ],
              "calories": 300,
              "macros": {
                "protein": 20,
                "carbs": 10,
                "fats": 20,
                "fiber": 5
              }
            },
            "morningSnack": {
              "name": "Lanche da Manhã",
              "description": "Pequena refeição para manter a energia.",
              "foods": [
                {
                  "name": "Maçã",
                  "portion": 1,
                  "unit": "unidade",
                  "details": "Maçã média."
                }
              ],
              "calories": 100,
              "macros": {
                "protein": 1,
                "carbs": 25,
                "fats": 0,
                "fiber": 4
              }
            },
            "lunch": {
              "name": "Almoço",
              "description": "Refeição principal do dia.",
              "foods": [
                {
                  "name": "Salada de Frango",
                  "portion": 200,
                  "unit": "gramas",
                  "details": "Salada de frango com legumes."
                }
              ],
              "calories": 400,
              "macros": {
                "protein": 30,
                "carbs": 20,
                "fats": 20,
                "fiber": 8
              }
            },
            "afternoonSnack": {
              "name": "Lanche da Tarde",
              "description": "Pequena refeição para evitar a fome.",
              "foods": [
                {
                  "name": "Iogurte",
                  "portion": 1,
                  "unit": "pote",
                  "details": "Iogurte natural."
                }
              ],
              "calories": 150,
              "macros": {
                "protein": 10,
                "carbs": 15,
                "fats": 5,
                "fiber": 0
              }
            },
            "dinner": {
              "name": "Jantar",
              "description": "Refeição leve para a noite.",
              "foods": [
                {
                  "name": "Sopa de Legumes",
                  "portion": 300,
                  "unit": "ml",
                  "details": "Sopa de legumes variados."
                }
              ],
              "calories": 250,
              "macros": {
                "protein": 10,
                "carbs": 30,
                "fats": 5,
                "fiber": 10
              }
            }
          },
          "dailyTotals": {
            "calories": 1200,
            "protein": 71,
            "carbs": 100,
            "fats": 50,
            "fiber": 27
          }
        },
        "sunday": {
          "dayName": "Sunday",
          "meals": {
            "breakfast": {
              "name": "Café da Manhã",
              "description": "Refeição para começar o dia com energia.",
              "foods": [
                {
                  "name": "Omelete",
                  "portion": 2,
                  "unit": "unidades",
                  "details": "Omelete com queijo e tomate."
                }
              ],
              "calories": 300,
              "macros": {
                "protein": 20,
                "carbs": 10,
                "fats": 20,
                "fiber": 5
              }
            },
            "morningSnack": {
              "name": "Lanche da Manhã",
              "description": "Pequena refeição para manter a energia.",
              "foods": [
                {
                  "name": "Maçã",
                  "portion": 1,
                  "unit": "unidade",
                  "details": "Maçã média."
                }
              ],
              "calories": 100,
              "macros": {
                "protein": 1,
                "carbs": 25,
                "fats": 0,
                "fiber": 4
              }
            },
            "lunch": {
              "name": "Almoço",
              "description": "Refeição principal do dia.",
              "foods": [
                {
                  "name": "Salada de Frango",
                  "portion": 200,
                  "unit": "gramas",
                  "details": "Salada de frango com legumes."
                }
              ],
              "calories": 400,
              "macros": {
                "protein": 30,
                "carbs": 20,
                "fats": 20,
                "fiber": 8
              }
            },
            "afternoonSnack": {
              "name": "Lanche da Tarde",
              "description": "Pequena refeição para evitar a fome.",
              "foods": [
                {
                  "name": "Iogurte",
                  "portion": 1,
                  "unit": "pote",
                  "details": "Iogurte natural."
                }
              ],
              "calories": 150,
              "macros": {
                "protein": 10,
                "carbs": 15,
                "fats": 5,
                "fiber": 0
              }
            },
            "dinner": {
              "name": "Jantar",
              "description": "Refeição leve para a noite.",
              "foods": [
                {
                  "name": "Sopa de Legumes",
                  "portion": 300,
                  "unit": "ml",
                  "details": "Sopa de legumes variados."
                }
              ],
              "calories": 250,
              "macros": {
                "protein": 10,
                "carbs": 30,
                "fats": 5,
                "fiber": 10
              }
            }
          },
          "dailyTotals": {
            "calories": 1200,
            "protein": 71,
            "carbs": 100,
            "fats": 50,
            "fiber": 27
          }
        }
      },
      "weeklyTotals": {
        "averageCalories": 1200,
        "averageProtein": 71,
        "averageCarbs": 100,
        "averageFats": 50,
        "averageFiber": 27
      },
      "recommendations": {
        "general": "Mantenha uma dieta equilibrada e variada.",
        "preworkout": "Coma carboidratos complexos e proteínas antes do treino.",
        "postworkout": "Consuma proteínas e carboidratos simples após o treino.",
        "timing": [
          "Tome café da manhã até uma hora depois de acordar.",
          "Faça um lanche a cada 3 horas.",
          "Jante pelo menos 2 horas antes de dormir."
        ]
      }
    }
    `;

    console.log("Prompt para o modelo:", prompt);

    // Chamada para o modelo de linguagem (exemplo com OpenAI)
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const model = "gpt-4";

    if (!openAIApiKey) {
      console.error("Chave da API OpenAI não configurada");
      return new Response(
        JSON.stringify({ error: "Chave da API OpenAI não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!apiResponse.ok) {
      console.error("Erro na chamada da API OpenAI:", apiResponse.status, apiResponse.statusText);
      try {
        const errorBody = await apiResponse.json();
        console.error("Detalhes do erro:", JSON.stringify(errorBody));
      } catch (e) {
        console.error("Erro ao analisar o corpo da resposta:", e);
      }
      return new Response(
        JSON.stringify({ error: "Erro ao gerar o plano alimentar", details: `Erro na API OpenAI: ${apiResponse.status} ${apiResponse.statusText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const responseData = await apiResponse.json();
    console.log("Resposta da API OpenAI:", JSON.stringify(responseData));

    const mealPlan = JSON.parse(responseData.choices[0].message.content);

    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erro na função generate-meal-plan:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao gerar o plano alimentar" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
