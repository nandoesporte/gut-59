
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Groq API endpoint
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set. Please configure this environment variable.");
    }

    console.log("Received request to generate rehab plan");
    console.log("User ID:", userId);
    console.log("Preferences:", JSON.stringify(preferences, null, 2));

    // Create system prompt for Groq
    const systemPrompt = `You are an expert physiotherapist and rehabilitation specialist. 
Your task is to create a personalized rehabilitation plan based on the patient's symptoms, 
conditions, and preferences. The plan should include exercises, treatments, and recommendations 
that are tailored to their specific needs. Use evidence-based practices and be detailed in your explanations.`;

    // Create user prompt based on provided preferences
    const userPrompt = `Please create a detailed rehabilitation plan for me based on the following information:

Injury/Condition: ${preferences.condition}
Pain Level (1-10): ${preferences.painLevel}
Pain Areas: ${preferences.painAreas.join(", ")}
Daily Activities: ${preferences.dailyActivities.join(", ")}
Previous Treatments: ${preferences.previousTreatments?.join(", ") || "None"}
Goals: ${preferences.goals.join(", ")}
Frequency preference: ${preferences.frequency} times per week
Exercise duration preference: ${preferences.duration} minutes
Equipment available: ${preferences.equipment.join(", ")}

My plan should include:
1. A clear breakdown of exercises with detailed instructions
2. Frequency and duration recommendations
3. Progression plan as my condition improves
4. Any precautions or modifications I should consider
5. Estimated timeline for recovery
6. Complementary treatments or modalities that might help

Please format the response as a structured rehabilitation plan with clear sections.`;

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",  // Using Llama 3 8B model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,  // Lower temperature for more predictable results
        max_tokens: 2000,  // Sufficient for detailed plan
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API error:", errorData);
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedPlan = data.choices[0].message.content;

    console.log("Successfully generated rehab plan with Groq");

    // Process and structure the rehab plan
    const structuredPlan = {
      overview: "Plano de reabilitação personalizado gerado com o modelo Groq Llama 3",
      condition: preferences.condition,
      painLevel: preferences.painLevel,
      painAreas: preferences.painAreas,
      plan: generatedPlan,
      exercises: [],
      recommendations: [],
      timeline: {},
      precautions: []
    };

    // Extract sections from the generated text
    const exercisesMatch = generatedPlan.match(/(?:Exercises:|EXERCISES:)([^#]*)/i);
    if (exercisesMatch) {
      // Simple extraction of exercises as an array
      const exerciseText = exercisesMatch[1].trim();
      const exerciseLines = exerciseText.split('\n').filter(line => line.trim().length > 0);
      
      // Try to extract each exercise with some basic structure
      structuredPlan.exercises = exerciseLines.map(line => {
        const exerciseParts = line.split(':');
        if (exerciseParts.length > 1) {
          return {
            name: exerciseParts[0].trim().replace(/^\d+\.\s*/, ''),
            instructions: exerciseParts[1].trim()
          };
        } else {
          return {
            name: line.trim().replace(/^\d+\.\s*/, ''),
            instructions: ''
          };
        }
      }).filter(ex => ex.name.length > 0);
    }

    // Extract recommendations
    const recommendationsMatch = generatedPlan.match(/(?:Recommendations:|RECOMMENDATIONS:)([^#]*)/i);
    if (recommendationsMatch) {
      const recommendationsText = recommendationsMatch[1].trim();
      structuredPlan.recommendations = recommendationsText
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
    }

    // Extract precautions
    const precautionsMatch = generatedPlan.match(/(?:Precautions:|PRECAUTIONS:)([^#]*)/i);
    if (precautionsMatch) {
      const precautionsText = precautionsMatch[1].trim();
      structuredPlan.precautions = precautionsText
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
    }

    // Extract timeline
    const timelineMatch = generatedPlan.match(/(?:Timeline:|TIMELINE:)([^#]*)/i);
    if (timelineMatch) {
      const timelineText = timelineMatch[1].trim();
      const timelineLines = timelineText
        .split('\n')
        .filter(line => line.trim().length > 0);
      
      structuredPlan.timeline = {
        description: timelineLines.join('\n'),
        phases: timelineLines.map(line => {
          const phaseMatch = line.match(/([^:]+):(.*)/);
          return phaseMatch ? 
            { name: phaseMatch[1].trim(), description: phaseMatch[2].trim() } : 
            { name: line.trim(), description: '' };
        })
      };
    }

    return new Response(JSON.stringify(structuredPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating rehab plan:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
