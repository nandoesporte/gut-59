
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'content-length, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Validate Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid content type',
          details: 'Content-Type must be application/json'
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    let requestData;
    try {
      requestData = await req.json();
      console.log('Received request data:', requestData);
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          details: parseError.message
        }), 
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const { userData, selectedFoods, dietaryPreferences } = requestData;

    // Validate required fields
    if (!userData || !selectedFoods || !dietaryPreferences) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'userData, selectedFoods, and dietaryPreferences are required'
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get selected foods details from database
    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods);

    if (foodsError) {
      console.error('Error fetching foods:', foodsError);
      return new Response(
        JSON.stringify({
          error: 'Database error',
          details: foodsError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    if (!foodsData || foodsData.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No foods found',
          details: 'No foods found for the selected IDs'
        }),
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          details: 'OpenAI API key is not configured'
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    console.log('Making request to OpenAI');

    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: `You are a professional nutritionist AI. You must create a meal plan following this EXACT JSON structure:
{
  "dailyPlan": {
    "breakfast": {
      "foods": [{"id": "string", "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number}],
      "calories": number,
      "macros": {"protein": number, "carbs": number, "fats": number}
    },
    "lunch": {
      "foods": [{"id": "string", "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number}],
      "calories": number,
      "macros": {"protein": number, "carbs": number, "fats": number}
    },
    "snacks": {
      "foods": [{"id": "string", "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number}],
      "calories": number,
      "macros": {"protein": number, "carbs": number, "fats": number}
    },
    "dinner": {
      "foods": [{"id": "string", "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number}],
      "calories": number,
      "macros": {"protein": number, "carbs": number, "fats": number}
    }
  },
  "totalNutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number
  },
  "recommendations": {
    "preworkout": "string",
    "postworkout": "string",
    "general": "string"
  }
}

Use ONLY the foods from the provided list. All numbers should be integers. The response MUST be a valid JSON object and DO NOT include markdown formatting, code blocks, or any other text besides the JSON object.`
            },
            { 
              role: 'user', 
              content: JSON.stringify({
                availableFoods: foodsData,
                userData: {
                  weight: userData.weight,
                  height: userData.height,
                  age: userData.age,
                  gender: userData.gender,
                  activityLevel: userData.activityLevel,
                  goal: userData.goal,
                  dailyCalories: userData.dailyCalories
                },
                dietaryPreferences
              })
            }
          ],
          temperature: 0.1, // Reduzido ainda mais para respostas mais consistentes
          max_tokens: 2000,
          presence_penalty: 0,
          frequency_penalty: 0
        })
      });

      if (!openAIResponse.ok) {
        const errorData = await openAIResponse.text();
        console.error('OpenAI error response:', errorData);
        throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorData}`);
      }

      const aiData = await openAIResponse.json();
      console.log('OpenAI response:', aiData);

      if (!aiData.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI');
      }

      const content = aiData.choices[0].message.content;
      console.log('Raw OpenAI content:', content);

      let mealPlan;
      try {
        // Remove qualquer formatação e espaços extras
        const cleanContent = content
          .trim()
          .replace(/^```json\n|\n```$/g, '')
          .replace(/^```\n|\n```$/g, '')
          .replace(/^\{|\}$/g, (match) => match); // Preserva as chaves do JSON

        console.log('Cleaned content:', cleanContent);
        
        mealPlan = JSON.parse(cleanContent);
        console.log('Parsed meal plan:', mealPlan);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Clean content that failed to parse:', cleanContent);
        throw new Error(`Failed to parse meal plan JSON: ${parseError.message}`);
      }

      // Validate meal plan structure
      if (!mealPlan.dailyPlan || !mealPlan.totalNutrition || !mealPlan.recommendations) {
        console.error('Invalid meal plan structure:', mealPlan);
        throw new Error('Invalid meal plan structure: missing required sections');
      }

      // Validate each required section
      ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(meal => {
        if (!mealPlan.dailyPlan[meal]?.foods?.length) {
          throw new Error(`Missing or invalid ${meal} foods`);
        }
      });

      return new Response(
        JSON.stringify(mealPlan),
        { headers: corsHeaders }
      );

    } catch (openAIError) {
      console.error('OpenAI or parsing error:', openAIError);
      return new Response(
        JSON.stringify({
          error: 'AI Processing Error',
          details: openAIError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
