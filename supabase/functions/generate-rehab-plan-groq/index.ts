
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

    // Fetch relevant exercises from the database based on joint area
    const { data: exercises, error: exercisesError } = await supabase
      .from('physio_exercises')
      .select('*')
      .eq('joint_area', preferences.joint_area)
      .order('name');

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error("Failed to fetch exercises from database");
    }

    console.log(`Found ${exercises?.length || 0} exercises for joint area: ${preferences.joint_area}`);

    // If no specific exercises found for the joint area, get some general exercises
    let relevantExercises = exercises;
    if (!relevantExercises || relevantExercises.length < 3) {
      console.log("Insufficient joint-specific exercises, fetching general exercises");
      const { data: generalExercises, error: generalError } = await supabase
        .from('physio_exercises')
        .select('*')
        .limit(10);
      
      if (!generalError && generalExercises) {
        relevantExercises = generalExercises;
        console.log(`Using ${generalExercises.length} general exercises`);
      }
    }

    // Prepare user data for prompt
    const painLevel = preferences.pain_level ? `Pain level: ${preferences.pain_level}/10` : 'Pain level not informed';
    const userWeight = userData?.weight || preferences.weight || 70;
    const userHeight = userData?.height || preferences.height || 170;
    const userAge = userData?.age || preferences.age || 30;
    const userGender = userData?.gender || preferences.gender || 'male';
    const jointArea = preferences.joint_area || 'knee';
    const mobilityLevel = preferences.mobility_level || 'moderate';
    const activityLevel = preferences.activity_level || 'moderate';
    const rehabGoal = 'pain_relief'; // Default goal for rehab

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

    // Add exercise information to the prompt
    const exerciseInfo = relevantExercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      joint_area: ex.joint_area,
      difficulty: ex.difficulty,
      description: ex.description,
      exercise_type: ex.exercise_type,
      gif_url: ex.gif_url
    }));

    // Append exercise data to prompt
    promptTemplate += `\n\nPlease use ONLY the following exercises from our database in your rehabilitation plan. Include their IDs to ensure proper tracking:\n${JSON.stringify(exerciseInfo, null, 2)}`;
    promptTemplate += `\n\nEnsure your response includes these specific exercises with their exact IDs, sets, reps, and rest times.`;

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

      // Enhance the plan with actual exercise data from our database
      if (rehabPlan.rehab_sessions && Array.isArray(rehabPlan.rehab_sessions)) {
        for (const session of rehabPlan.rehab_sessions) {
          if (session.exercises && Array.isArray(session.exercises)) {
            for (const exercise of session.exercises) {
              // Check if exercise has an ID reference
              if (exercise.exercise_id) {
                // Find the matching exercise in our database
                const dbExercise = relevantExercises.find(e => e.id === exercise.exercise_id);
                if (dbExercise) {
                  // Enhance the exercise with database data
                  exercise.name = dbExercise.name;
                  exercise.description = dbExercise.description;
                  exercise.gifUrl = dbExercise.gif_url;
                  exercise.exerciseType = dbExercise.exercise_type;
                  exercise.difficulty = dbExercise.difficulty;
                }
              }
            }
          }
        }
      }

      // Transform plan data to a consistent format
      console.log("Converting plan data to display format");
      
      // Add plan_data property for database storage
      const plan_data = structuredClone(rehabPlan);
      
      // Set condition property using preferences
      rehabPlan.condition = preferences.condition || "General rehabilitation";
      
      // Ensure days structure exists for display component
      if (!rehabPlan.days) {
        console.log("Creating days structure from rehab sessions");
        rehabPlan.days = {};
        
        // Check if we have rehab_sessions to convert
        if (rehabPlan.rehab_sessions && Array.isArray(rehabPlan.rehab_sessions)) {
          rehabPlan.rehab_sessions.forEach((session, index) => {
            const dayKey = `day${index + 1}`;
            
            // Create exercise structure for display component
            rehabPlan.days[dayKey] = {
              notes: session.notes || `Day ${index + 1} of treatment`,
              exercises: [{
                title: "Rehabilitation Exercises",
                exercises: (session.exercises || []).map(ex => ({
                  name: ex.name,
                  sets: ex.sets,
                  reps: ex.reps,
                  restTime: `${Math.floor(ex.rest_time_seconds / 60)} minutes ${ex.rest_time_seconds % 60} seconds`,
                  description: ex.description || "Perform exercise carefully with attention to technique.",
                  gifUrl: ex.gifUrl || null
                }))
              }]
            };
          });
        } else if (rehabPlan.exercises && Array.isArray(rehabPlan.exercises)) {
          // Simple plan with just a list of exercises
          rehabPlan.days = {
            day1: {
              notes: rehabPlan.overview || "Day 1 of treatment",
              exercises: [{
                title: "Rehabilitation Exercises",
                exercises: rehabPlan.exercises.map(ex => ({
                  name: ex.name,
                  sets: ex.sets,
                  reps: ex.reps,
                  restTime: `${Math.floor((ex.rest_time_seconds || 60) / 60)} minutes ${(ex.rest_time_seconds || 60) % 60} seconds`,
                  description: ex.description || ex.notes || "Perform exercise carefully with attention to technique.",
                  gifUrl: ex.gifUrl || null
                }))
              }]
            }
          };
        }
      }
      
      // If no days structure could be created, create a simple one-day plan
      if (!rehabPlan.days || Object.keys(rehabPlan.days).length === 0) {
        console.log("Creating minimal one-day plan structure");
        rehabPlan.days = {
          day1: {
            notes: "Default rehabilitation plan",
            exercises: [{
              title: "Rehabilitation Exercises",
              exercises: []
            }]
          }
        };
      }
      
      // Ensure we have overview and recommendations
      if (!rehabPlan.overview && rehabPlan.description) {
        rehabPlan.overview = rehabPlan.description;
      }
      
      if (!rehabPlan.recommendations && rehabPlan.general_recommendations) {
        rehabPlan.recommendations = rehabPlan.general_recommendations;
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
            goal: rehabGoal,
            condition: preferences.condition,
            joint_area: preferences.joint_area,
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
            .select('rehabilitation_count, last_reset_date')
            .eq('user_id', userData.id)
            .maybeSingle();
            
          if (countError) {
            console.error("Error checking plan count:", countError);
          }
          
          if (planCount) {
            await supabase
              .from('plan_generation_counts')
              .update({
                rehabilitation_count: planCount.rehabilitation_count + 1,
                updated_at: now
              })
              .eq('user_id', userData.id);
          } else {
            await supabase
              .from('plan_generation_counts')
              .insert({
              user_id: userData.id,
              rehabilitation_count: 1,
              updated_at: now,
              created_at: now
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
