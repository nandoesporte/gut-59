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
    // Further limit to just 5 exercises to significantly reduce context size
    const { data: exercises, error: exercisesError } = await supabase
      .from('physio_exercises')
      .select('id,name,joint_area,difficulty,exercise_type')
      .eq('joint_area', preferences.joint_area)
      .order('name')
      .limit(5); // Reduced from 10 to 5

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
        .select('id,name,joint_area,difficulty,exercise_type')
        .limit(3); // Reduced from 5 to 3
      
      if (!generalError && generalExercises) {
        relevantExercises = generalExercises;
        console.log(`Using ${generalExercises.length} general exercises`);
      }
    }

    // Prepare user data for prompt
    const painLevel = preferences.pain_level ? `${preferences.pain_level}/10` : '5/10';
    const userWeight = userData?.weight || preferences.weight || 70;
    const userHeight = userData?.height || preferences.height || 170;
    const userAge = userData?.age || preferences.age || 30;
    const userGender = userData?.gender || preferences.gender || 'male';
    const jointArea = preferences.joint_area || 'knee';
    const mobilityLevel = preferences.mobility_level || 'moderate';
    const activityLevel = preferences.activity_level || 'moderate';
    const rehabGoal = preferences.goal || 'pain_relief'; // Default goal for rehab

    // Get base prompt from Fisio+ agent - Significantly truncate to reduce size
    let promptTemplate = promptData.prompt;
    if (promptTemplate.length > 1000) { // Reduced from 2000 to 1000
      promptTemplate = promptTemplate.substring(0, 1000) + "...";
      console.log("Prompt was significantly truncated to reduce context size");
    }
    
    // Use a much more compact context data structure
    const contextData = {
      user_weight: userWeight,
      user_height: userHeight,
      user_age: userAge,
      user_gender: userGender === 'male' ? 'M' : 'F',
      joint_area: jointArea,
      pain_level: painLevel,
      mobility: mobilityLevel,
      activity: activityLevel
    };

    // Create a minimal prompt with essential information only
    const minimalPrompt = `Create a rehabilitation plan for ${contextData.joint_area} with pain level ${contextData.pain_level}. Patient: ${contextData.user_age}yo, ${contextData.user_gender}, ${contextData.user_weight}kg, ${contextData.user_height}cm. Mobility: ${contextData.mobility}, Activity: ${contextData.activity}.`;

    // Add exercise information to the prompt with minimal data
    const exerciseInfo = relevantExercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      area: ex.joint_area,
      type: ex.exercise_type
    }));

    // Ultra-compact prompt for exercises
    const exercisePrompt = `Use these exercises (IDs only):\n${JSON.stringify(exerciseInfo)}`;
    
    // Combine into a compact final prompt
    const finalPrompt = `${minimalPrompt}\n\n${exercisePrompt}`;
    
    console.log(`Prompt length: ${finalPrompt.length} characters`);
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
          { role: "user", content: finalPrompt }
        ],
        max_tokens: 2048, // Reduced from 4096 to 2048
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
                  exercise.exerciseType = dbExercise.exercise_type;
                  exercise.difficulty = dbExercise.difficulty;
                }
              }
            }
          }
        }
      }

      // Get additional exercise details after the plan is generated to keep initial context small
      const exerciseIds = [];
      
      // Extract all exercise IDs from the plan
      if (rehabPlan.rehab_sessions && Array.isArray(rehabPlan.rehab_sessions)) {
        for (const session of rehabPlan.rehab_sessions) {
          if (session.exercises && Array.isArray(session.exercises)) {
            for (const exercise of session.exercises) {
              if (exercise.exercise_id && !exerciseIds.includes(exercise.exercise_id)) {
                exerciseIds.push(exercise.exercise_id);
              }
            }
          }
        }
      }
      
      // Fetch full exercise details if we have exercise IDs
      if (exerciseIds.length > 0) {
        const { data: exerciseDetails, error: detailsError } = await supabase
          .from('physio_exercises')
          .select('*')
          .in('id', exerciseIds);
          
        if (!detailsError && exerciseDetails) {
          // Enhance exercises with full details
          if (rehabPlan.rehab_sessions) {
            for (const session of rehabPlan.rehab_sessions) {
              if (session.exercises) {
                for (const exercise of session.exercises) {
                  if (exercise.exercise_id) {
                    const fullDetails = exerciseDetails.find(d => d.id === exercise.exercise_id);
                    if (fullDetails) {
                      exercise.description = fullDetails.description;
                      exercise.gifUrl = fullDetails.gif_url;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Transform plan data to a consistent format
      console.log("Converting plan data to display format");
      
      // Add plan_data property for database storage - define planData variable here to avoid reference error
      const planData = JSON.parse(JSON.stringify(rehabPlan));
      
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
            plan_data: planData  // Now correctly using the planData that was defined above
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
