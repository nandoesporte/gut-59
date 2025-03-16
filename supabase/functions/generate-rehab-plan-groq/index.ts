
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const TIMEOUT_MS = 60000; // 60 seconds timeout

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userData } = await req.json();
    
    console.log("Generating rehabilitation plan with Fisio+ agent");
    console.log("User data:", JSON.stringify(userData));
    console.log("Preferences:", JSON.stringify(preferences));
    
    if (!preferences) {
      throw new Error("Insufficient data to generate rehabilitation plan");
    }

    // Create Supabase client
    const supabase = supabaseClient();

    // Fetch active prompt for Fisio+ agent
    const { data: promptData, error: promptError } = await supabase
      .from('ai_agent_prompts')
      .select('*')
      .eq('agent_type', 'physiotherapy')
      .eq('is_active', true)
      .single();

    if (promptError) {
      console.error("Error fetching Fisio+ agent prompt:", promptError);
      throw new Error("Could not find Fisio+ agent prompt");
    }

    if (!promptData) {
      throw new Error("No active physiotherapy prompt found");
    }

    console.log("Prompt found:", promptData.name);

    // Prepare user data for prompt
    const painLevel = preferences.pain_level ? `Pain level: ${preferences.pain_level}/10` : 'Pain level not informed';
    const userWeight = userData?.weight || preferences.weight || 70;
    const userHeight = userData?.height || preferences.height || 170;
    const userAge = userData?.age || preferences.age || 30;
    const userGender = userData?.gender || preferences.gender || 'male';
    const jointArea = preferences.joint_area || 'knee';
    const mobilityLevel = preferences.mobility_level || 'moderate';
    const activityLevel = preferences.activity_level || 'moderate';

    // Get base prompt from Fisio+ agent
    let promptTemplate = promptData.prompt;
    
    // Replace variables in template
    const contextData = {
      user_weight: userWeight,
      user_height: userHeight,
      user_age: userAge,
      user_gender: userGender === 'male' ? 'Masculino' : 'Feminino',
      joint_area: jointArea,
      pain_level: preferences.pain_level || 5,
      mobility_level: mobilityLevel,
      activity_level: activityLevel
    };

    // Replace variables in template
    Object.entries(contextData).forEach(([key, value]) => {
      promptTemplate = promptTemplate.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    console.log("Sending prompt to llama3-8b-8192 model");

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured in environment");
    }

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout generating rehabilitation plan")), TIMEOUT_MS);
    });

    // Call Groq API to generate rehabilitation plan with timeout
    const groqPromise = fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { 
            role: "system", 
            content: "You are a physiotherapist specialized in creating personalized rehabilitation plans. Always respond with valid JSON, using a properly structured and complete object without truncating or using placeholders like '...and so on'. The JSON should be in a format that can be directly used by an application, without any additional text or formatting."
          },
          { role: "user", content: promptTemplate }
        ],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    // Race between API call and timeout
    const response = await Promise.race([groqPromise, timeoutPromise]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error in Groq API call (${response.status}):`, errorText);
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    const groqResponse = await response.json();
    console.log("Response received from Groq API");

    if (!groqResponse.choices || !groqResponse.choices[0] || !groqResponse.choices[0].message) {
      console.error("Unexpected response format:", groqResponse);
      throw new Error("Unexpected response format");
    }

    let rehabPlanJson = groqResponse.choices[0].message.content;
    console.log("Raw JSON content received:", rehabPlanJson);

    // Process JSON response
    let rehabPlan;
    try {
      // Check if response is already a string or an object
      if (typeof rehabPlanJson === 'string') {
        // Clean response if it contains markdown code blocks
        if (rehabPlanJson.includes('```json')) {
          console.log("Removing markdown markers from JSON");
          rehabPlanJson = rehabPlanJson.replace(/```json\n|\n```/g, '');
        }
        
        // Try to parse JSON
        try {
          rehabPlan = JSON.parse(rehabPlanJson);
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
          
          // Try to extract only valid JSON part
          const jsonMatch = rehabPlanJson.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log("Attempting to extract only valid JSON part");
            try {
              rehabPlan = JSON.parse(jsonMatch[0]);
            } catch (fallbackError) {
              console.error("Failed to extract JSON even with regexp:", fallbackError);
              throw new Error("Invalid JSON even after extraction attempt");
            }
          } else {
            throw new Error("Could not extract valid JSON from response");
          }
        }
      } else if (typeof rehabPlanJson === 'object') {
        rehabPlan = rehabPlanJson;
      } else {
        throw new Error("Invalid response format");
      }

      // Add required fields for compatibility with ExercisePlanDisplay component
      if (!rehabPlan.days && rehabPlan.rehab_sessions) {
        console.log("Converting rehab_sessions to days format for display");
        rehabPlan.days = {};
        
        rehabPlan.rehab_sessions.forEach((session, index) => {
          const dayKey = `day${index + 1}`;
          
          // Create exercise structure for display component
          rehabPlan.days[dayKey] = {
            notes: session.notes || `Day ${index + 1} of treatment`,
            exercises: [{
              title: "Rehabilitation Exercises",
              exercises: session.exercises.map(ex => ({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                restTime: `${Math.floor(ex.rest_time_seconds / 60)} minutes ${ex.rest_time_seconds % 60} seconds`,
                description: ex.notes || "Perform exercise carefully with attention to technique.",
                gifUrl: ex.gifUrl || null
              }))
            }]
          };
        });
      }
      
      console.log("Final rehabilitation plan structure:", JSON.stringify(rehabPlan, null, 2));
    } catch (parseError) {
      console.error("Error analyzing JSON:", parseError);
      console.error("Problematic JSON content:", rehabPlanJson);
      throw new Error("Error processing response: " + parseError.message);
    }

    // Save rehabilitation plan to database if user is authenticated
    if (userData?.id) {
      try {
        // Save rehabilitation plan
        const { error: insertError } = await supabase
          .from('rehab_plans')
          .insert({
            user_id: userData.id,
            goal: preferences.goal || 'pain_relief',
            condition: preferences.condition,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 days later
            plan_data: rehabPlan
          });

        if (insertError) {
          console.error("Error saving rehabilitation plan:", insertError);
        } else {
          console.log("Rehabilitation plan saved successfully!");
        
          // Update plan generation count
          const now = new Date().toISOString();
          const { data: planCount, error: countError } = await supabase
            .from('plan_generation_counts')
            .select('count, last_reset_date')
            .eq('user_id', userData.id)
            .eq('plan_type', 'rehab_plan')
            .maybeSingle();
            
          if (countError) {
            console.error("Error checking plan count:", countError);
          }
          
          if (planCount) {
            await supabase
              .from('plan_generation_counts')
              .update({
                count: planCount.count + 1,
                last_generated_date: now
              })
              .eq('user_id', userData.id)
              .eq('plan_type', 'rehab_plan');
          } else {
            await supabase
              .from('plan_generation_counts')
              .insert({
              user_id: userData.id,
              plan_type: 'rehab_plan',
              count: 1,
              last_generated_date: now,
              last_reset_date: now
            });
          }
        }
      } catch (dbError) {
        console.error("Error interacting with database:", dbError);
      }
    }

    return new Response(
      JSON.stringify(rehabPlan),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Complete error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred generating the rehabilitation plan"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
