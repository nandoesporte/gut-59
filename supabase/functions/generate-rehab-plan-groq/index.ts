
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
    const { preferences, userId } = await req.json();
    
    console.log("Generating rehabilitation plan with Fisio+ agent");
    console.log("User data:", userId ? "Authenticated user" : "User data not provided");
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

    // Fetch user information
    let userData = null;
    if (userId) {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!userError && user) {
        userData = user;
        console.log("User profile retrieved");
      } else {
        console.log("User profile not found, using preferences only");
      }
    }

    // Fetch a more diverse set of exercises from the database based on joint area
    // Get a mix of stretching, mobility, and strengthening exercises
    const joinArea = preferences.joint_area || 'knee';
    
    const fetchExercisesByType = async (exerciseType, limit = 3) => {
      const { data, error } = await supabase
        .from('physio_exercises')
        .select('*')
        .eq('joint_area', joinArea)
        .eq('exercise_type', exerciseType)
        .limit(limit);
        
      if (error) {
        console.error(`Error fetching ${exerciseType} exercises:`, error);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} ${exerciseType} exercises`);
      return data || [];
    };
    
    // Fetch exercises of different types
    const stretchingExercises = await fetchExercisesByType('stretching');
    const mobilityExercises = await fetchExercisesByType('mobility');
    const strengthExercises = await fetchExercisesByType('strength');
    
    // Combine all exercises
    let allExercises = [...stretchingExercises, ...mobilityExercises, ...strengthExercises];
    
    // If we don't have enough exercises of specific types, fetch additional ones
    if (allExercises.length < 5) {
      console.log("Insufficient type-specific exercises, fetching additional ones");
      const { data: additionalExercises, error } = await supabase
        .from('physio_exercises')
        .select('*')
        .eq('joint_area', joinArea)
        .limit(5 - allExercises.length);
        
      if (!error && additionalExercises) {
        allExercises = [...allExercises, ...additionalExercises];
      }
    }
    
    // If still not enough exercises, get general ones regardless of joint area
    if (allExercises.length < 3) {
      console.log("Insufficient joint-specific exercises, fetching general exercises");
      const { data: generalExercises, error } = await supabase
        .from('physio_exercises')
        .select('*')
        .limit(3);
        
      if (!error && generalExercises) {
        allExercises = [...allExercises, ...generalExercises];
      }
    }

    console.log(`Using ${allExercises.length} total exercises with focus on joint area: ${joinArea}`);

    // Prepare user data for prompt
    const painLevel = preferences.pain_level ? `${preferences.pain_level}/10` : '5/10';
    const userWeight = userData?.weight || preferences.weight || 70;
    const userHeight = userData?.height || preferences.height || 170;
    const userAge = userData?.age || preferences.age || 30;
    const userGender = userData?.gender || preferences.gender || 'male';
    const mobilityLevel = preferences.mobility_level || 'moderate';
    const activityLevel = preferences.activity_level || 'moderate';
    const rehabGoal = preferences.goal || 'pain_relief'; // Default goal for rehab

    // Create a prompt with essential information
    const basePrompt = `Create a comprehensive rehabilitation plan for ${joinArea} with pain level ${painLevel}. 
Patient details: ${userAge} years old, ${userGender}, ${userWeight}kg, ${userHeight}cm.
Mobility level: ${mobilityLevel}, Activity level: ${activityLevel}, Goal: ${rehabGoal}.
Plan must include at least 3 types of exercises: stretching, mobility, and strengthening exercises.`;

    // Add exercise information to the prompt
    const exerciseInfo = allExercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      type: ex.exercise_type,
      area: ex.joint_area,
      description: ex.description?.substring(0, 100) || "",
      gifUrl: ex.gif_url || null
    }));

    // Final prompt for the model
    const finalPrompt = `${basePrompt}
Use these exercises in your plan (include ALL types - stretching, mobility and strengthening):
${JSON.stringify(exerciseInfo)}
Format response as valid JSON with following structure:
- overview: brief explanation of condition and approach
- recommendations: array of general guidance points
- rehab_sessions: array of daily sessions with exercises (exercise_id, sets, reps, rest_time_seconds)
Make sure each exercise contains complete details including description and gifUrl.`;

    console.log(`Sending prompt to LLM model`);

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
            content: "You are a physiotherapist specialized in creating personalized rehabilitation plans. Always respond with valid JSON using a properly structured and complete object. The plan must include a variety of exercise types: stretching, mobility, and strengthening exercises to provide a balanced approach to rehabilitation."
          },
          { role: "user", content: finalPrompt }
        ],
        max_tokens: 2048,
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
    console.log("Raw JSON content received");

    // Process JSON response
    let rehabPlan;
    try {
      // Parse JSON if it's a string
      if (typeof rehabPlanJson === 'string') {
        if (rehabPlanJson.includes('```json')) {
          console.log("Removing markdown markers from JSON");
          rehabPlanJson = rehabPlanJson.replace(/```json\n|\n```/g, '');
        }
        
        try {
          rehabPlan = JSON.parse(rehabPlanJson);
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
          
          // Try to extract valid JSON part
          const jsonMatch = rehabPlanJson.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log("Attempting to extract only valid JSON part");
            try {
              rehabPlan = JSON.parse(jsonMatch[0]);
            } catch (fallbackError) {
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

      // Enhance the plan with complete exercise data from database
      console.log("Enhancing plan with database exercise details");
      
      if (rehabPlan.rehab_sessions && Array.isArray(rehabPlan.rehab_sessions)) {
        for (const session of rehabPlan.rehab_sessions) {
          if (session.exercises && Array.isArray(session.exercises)) {
            for (const exercise of session.exercises) {
              // Check if exercise has an ID reference
              if (exercise.exercise_id) {
                // Find the matching exercise in our database
                const dbExercise = allExercises.find(e => e.id === exercise.exercise_id);
                if (dbExercise) {
                  // Enhance the exercise with database data
                  exercise.name = dbExercise.name;
                  exercise.exerciseType = dbExercise.exercise_type;
                  exercise.difficulty = dbExercise.difficulty;
                  exercise.description = dbExercise.description || "Perform this exercise with proper form and controlled movements.";
                  exercise.gifUrl = dbExercise.gif_url;
                  
                  // Ensure we have at least the minimum required fields
                  if (!exercise.sets) exercise.sets = dbExercise.recommended_sets || 3;
                  if (!exercise.reps) exercise.reps = dbExercise.recommended_repetitions || 10;
                  if (!exercise.rest_time_seconds) exercise.rest_time_seconds = dbExercise.rest_time_seconds || 30;
                }
              }
            }
          }
        }
      }

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
              exercises: (session.exercises || []).map(ex => ({
                name: ex.name,
                sets: ex.sets || 3,
                reps: ex.reps || 10,
                restTime: `${Math.floor((ex.rest_time_seconds || 30) / 60)} minutes ${(ex.rest_time_seconds || 30) % 60} seconds`,
                description: ex.description || "Perform exercise carefully with attention to technique.",
                gifUrl: ex.gifUrl || null,
                exerciseType: ex.exerciseType || "unspecified"
              }))
            };
          });
        }
      }
      
      // Ensure we have overview and recommendations
      if (!rehabPlan.overview && rehabPlan.description) {
        rehabPlan.overview = rehabPlan.description;
      }
      
      if (!rehabPlan.recommendations && rehabPlan.general_recommendations) {
        rehabPlan.recommendations = rehabPlan.general_recommendations;
      }

      // Add default recommendations if none provided
      if (!rehabPlan.recommendations || !Array.isArray(rehabPlan.recommendations) || rehabPlan.recommendations.length === 0) {
        rehabPlan.recommendations = [
          "Realize os exercícios diariamente para melhores resultados.",
          "Se sentir dor intensa, pare imediatamente e consulte um profissional.",
          "Progrida gradualmente na intensidade dos exercícios.",
          "Mantenha uma boa hidratação durante todo o processo de reabilitação.",
          "Combine os exercícios com períodos adequados de descanso."
        ];
      }
      
      // Set condition property using preferences
      rehabPlan.condition = preferences.condition || "General rehabilitation";
      rehabPlan.joint_area = preferences.joint_area || "knee";
      rehabPlan.goal = rehabGoal;
      rehabPlan.start_date = new Date().toISOString();
      rehabPlan.end_date = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(); // 28 days later
      
      console.log("Final rehabilitation plan structure prepared");
    } catch (parseError) {
      console.error("Error analyzing JSON:", parseError);
      throw new Error("Error processing response: " + parseError.message);
    }

    // Save rehabilitation plan to database if user is authenticated
    if (userId) {
      try {
        // Ensure planData is defined before trying to use it
        const planData = JSON.parse(JSON.stringify(rehabPlan));
        
        // Save rehabilitation plan
        const { data: savedPlan, error: insertError } = await supabase
          .from('rehab_plans')
          .insert({
            user_id: userId,
            goal: rehabGoal,
            condition: preferences.condition,
            joint_area: preferences.joint_area,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 days later
            plan_data: planData
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error saving rehabilitation plan:", insertError);
        } else {
          console.log("Rehabilitation plan saved successfully!");
          
          // Set the ID from the database record
          if (savedPlan) {
            rehabPlan.id = savedPlan.id;
          }
        
          // Update plan generation count
          const now = new Date().toISOString();
          const { data: planCount, error: countError } = await supabase
            .from('plan_generation_counts')
            .select('rehabilitation_count')
            .eq('user_id', userId)
            .maybeSingle();
            
          if (countError) {
            console.error("Error checking plan count:", countError);
          }
          
          if (planCount) {
            await supabase
              .from('plan_generation_counts')
              .update({
                rehabilitation_count: (planCount.rehabilitation_count || 0) + 1,
                updated_at: now
              })
              .eq('user_id', userId);
          } else {
            await supabase
              .from('plan_generation_counts')
              .insert({
                user_id: userId,
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
