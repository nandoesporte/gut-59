export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_agent_prompts: {
        Row: {
          agent_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          prompt: string
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          prompt: string
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          prompt?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_model_settings: {
        Row: {
          active_model: string | null
          created_at: string | null
          groq_api_key: string | null
          id: string
          system_prompt: string | null
          updated_at: string | null
          use_custom_prompt: boolean | null
        }
        Insert: {
          active_model?: string | null
          created_at?: string | null
          groq_api_key?: string | null
          id?: string
          system_prompt?: string | null
          updated_at?: string | null
          use_custom_prompt?: boolean | null
        }
        Update: {
          active_model?: string | null
          created_at?: string | null
          groq_api_key?: string | null
          id?: string
          system_prompt?: string | null
          updated_at?: string | null
          use_custom_prompt?: boolean | null
        }
        Relationships: []
      }
      daily_tips: {
        Row: {
          content: string
          created_at: string | null
          id: number
          theme: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          theme?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          theme?: string | null
        }
        Relationships: []
      }
      education_progress: {
        Row: {
          completed: boolean | null
          created_at: string | null
          day: number | null
          id: string
          phase: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          day?: number | null
          id?: string
          phase?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          day?: number | null
          id?: string
          phase?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          balance_requirement: string | null
          breathing_pattern: string | null
          calories_burned_per_hour: number | null
          category: string | null
          common_mistakes: string[] | null
          contraindicated_conditions: string[] | null
          coordination_requirement: string | null
          created_at: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"] | null
          equipment_complexity: string | null
          equipment_needed: string[] | null
          exercise_type:
            | Database["public"]["Enums"]["exercise_type_enum"]
            | null
          flexibility_requirement: string | null
          gif_url: string | null
          goals: string[] | null
          id: string
          is_compound_movement: boolean | null
          mobility_requirements: string | null
          movement_pattern: string | null
          muscle_group: string | null
          name: string
          power_requirement: string | null
          preparation_time_minutes: number | null
          primary_muscles_worked: string[] | null
          progression_variations: string[] | null
          recommended_warm_up: string | null
          regression_variations: string[] | null
          safety_considerations: string[] | null
          secondary_muscles_worked: string[] | null
          stability_requirement: string | null
          suitable_for_conditions: string[] | null
          target_heart_rate_zone: string[] | null
          tempo_recommendation: string | null
          training_phases: string[] | null
          typical_duration_seconds: number | null
        }
        Insert: {
          balance_requirement?: string | null
          breathing_pattern?: string | null
          calories_burned_per_hour?: number | null
          category?: string | null
          common_mistakes?: string[] | null
          contraindicated_conditions?: string[] | null
          coordination_requirement?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          equipment_complexity?: string | null
          equipment_needed?: string[] | null
          exercise_type?:
            | Database["public"]["Enums"]["exercise_type_enum"]
            | null
          flexibility_requirement?: string | null
          gif_url?: string | null
          goals?: string[] | null
          id?: string
          is_compound_movement?: boolean | null
          mobility_requirements?: string | null
          movement_pattern?: string | null
          muscle_group?: string | null
          name: string
          power_requirement?: string | null
          preparation_time_minutes?: number | null
          primary_muscles_worked?: string[] | null
          progression_variations?: string[] | null
          recommended_warm_up?: string | null
          regression_variations?: string[] | null
          safety_considerations?: string[] | null
          secondary_muscles_worked?: string[] | null
          stability_requirement?: string | null
          suitable_for_conditions?: string[] | null
          target_heart_rate_zone?: string[] | null
          tempo_recommendation?: string | null
          training_phases?: string[] | null
          typical_duration_seconds?: number | null
        }
        Update: {
          balance_requirement?: string | null
          breathing_pattern?: string | null
          calories_burned_per_hour?: number | null
          category?: string | null
          common_mistakes?: string[] | null
          contraindicated_conditions?: string[] | null
          coordination_requirement?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          equipment_complexity?: string | null
          equipment_needed?: string[] | null
          exercise_type?:
            | Database["public"]["Enums"]["exercise_type_enum"]
            | null
          flexibility_requirement?: string | null
          gif_url?: string | null
          goals?: string[] | null
          id?: string
          is_compound_movement?: boolean | null
          mobility_requirements?: string | null
          movement_pattern?: string | null
          muscle_group?: string | null
          name?: string
          power_requirement?: string | null
          preparation_time_minutes?: number | null
          primary_muscles_worked?: string[] | null
          progression_variations?: string[] | null
          recommended_warm_up?: string | null
          regression_variations?: string[] | null
          safety_considerations?: string[] | null
          secondary_muscles_worked?: string[] | null
          stability_requirement?: string | null
          suitable_for_conditions?: string[] | null
          target_heart_rate_zone?: string[] | null
          tempo_recommendation?: string | null
          training_phases?: string[] | null
          typical_duration_seconds?: number | null
        }
        Relationships: []
      }
      fit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          qr_code_id: string | null
          recipient_id: string | null
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          qr_code_id?: string | null
          recipient_id?: string | null
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          qr_code_id?: string | null
          recipient_id?: string | null
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fit_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      food_groups: {
        Row: {
          display_name: string
          id: number
          name: string
        }
        Insert: {
          display_name: string
          id?: number
          name: string
        }
        Update: {
          display_name?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      health_assessments: {
        Row: {
          assessment_type: string
          created_at: string | null
          id: string
          responses: Json
          score: number
          user_id: string
        }
        Insert: {
          assessment_type: string
          created_at?: string | null
          id?: string
          responses: Json
          score: number
          user_id: string
        }
        Update: {
          assessment_type?: string
          created_at?: string | null
          id?: string
          responses?: Json
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          calories: number | null
          created_at: string | null
          id: string
          plan_data: Json
          user_id: string
        }
        Insert: {
          calories?: number | null
          created_at?: string | null
          id?: string
          plan_data: Json
          user_id: string
        }
        Update: {
          calories?: number | null
          created_at?: string | null
          id?: string
          plan_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      meal_types: {
        Row: {
          display_name: string
          id: number
          name: string
          phase: number | null
        }
        Insert: {
          display_name: string
          id?: number
          name: string
          phase?: number | null
        }
        Update: {
          display_name?: string
          id?: number
          name?: string
          phase?: number | null
        }
        Relationships: []
      }
      meals: {
        Row: {
          created_at: string | null
          custom_food: string | null
          description: string | null
          food_group_id: number | null
          id: string
          meal_date: string | null
          meal_type: string | null
          photo_url: string | null
          protocol_food_id: string | null
          protocol_phase: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_food?: string | null
          description?: string | null
          food_group_id?: number | null
          id?: string
          meal_date?: string | null
          meal_type?: string | null
          photo_url?: string | null
          protocol_food_id?: string | null
          protocol_phase?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_food?: string | null
          description?: string | null
          food_group_id?: number | null
          id?: string
          meal_date?: string | null
          meal_type?: string | null
          photo_url?: string | null
          protocol_food_id?: string | null
          protocol_phase?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_food_group_id_fkey"
            columns: ["food_group_id"]
            isOneToOne: false
            referencedRelation: "food_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_protocol_food_id_fkey"
            columns: ["protocol_food_id"]
            isOneToOne: false
            referencedRelation: "protocol_foods"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_settings: {
        Row: {
          breathing_exercise_daily_limit: number | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          breathing_exercise_daily_limit?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          breathing_exercise_daily_limit?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mental_modules: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          status: Database["public"]["Enums"]["status_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mental_resources: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          phone_number: string | null
          resource_type: string
          status: Database["public"]["Enums"]["status_type"] | null
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          phone_number?: string | null
          resource_type: string
          status?: Database["public"]["Enums"]["status_type"] | null
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          phone_number?: string | null
          resource_type?: string
          status?: Database["public"]["Enums"]["status_type"] | null
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      mental_videos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          module_id: string | null
          status: Database["public"]["Enums"]["status_type"] | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["status_type"] | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["status_type"] | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mental_videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "mental_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
          type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
          type?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string | null
          id: string
          plan_type: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_type: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_type?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      physio_exercises: {
        Row: {
          category: string | null
          condition_target: string | null
          created_at: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"] | null
          exercise_type:
            | Database["public"]["Enums"]["exercise_type_enum"]
            | null
          gif_url: string | null
          id: string
          joint_area: string | null
          muscle_group: string | null
          name: string
        }
        Insert: {
          category?: string | null
          condition_target?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          exercise_type?:
            | Database["public"]["Enums"]["exercise_type_enum"]
            | null
          gif_url?: string | null
          id?: string
          joint_area?: string | null
          muscle_group?: string | null
          name: string
        }
        Update: {
          category?: string | null
          condition_target?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          exercise_type?:
            | Database["public"]["Enums"]["exercise_type_enum"]
            | null
          gif_url?: string | null
          id?: string
          joint_area?: string | null
          muscle_group?: string | null
          name?: string
        }
        Relationships: []
      }
      plan_generation_counts: {
        Row: {
          created_at: string | null
          id: string
          meal_plan_count: number | null
          rehabilitation_count: number | null
          updated_at: string | null
          user_id: string
          workout_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meal_plan_count?: number | null
          rehabilitation_count?: number | null
          updated_at?: string | null
          user_id: string
          workout_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meal_plan_count?: number | null
          rehabilitation_count?: number | null
          updated_at?: string | null
          user_id?: string
          workout_count?: number | null
        }
        Relationships: []
      }
      professionals: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          photo_url: string | null
          status: Database["public"]["Enums"]["status_type"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["status_type"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["status_type"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string | null
          email: string | null
          health_conditions: string | null
          id: string
          name: string | null
          photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          email?: string | null
          health_conditions?: string | null
          id: string
          name?: string | null
          photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          email?: string | null
          health_conditions?: string | null
          id?: string
          name?: string | null
          photo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      protocol_days: {
        Row: {
          content: string
          created_at: string | null
          day: number
          description: string | null
          id: number
          phase_id: number | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          day: number
          description?: string | null
          id?: number
          phase_id?: number | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          day?: number
          description?: string | null
          id?: number
          phase_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_days_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "protocol_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_foods: {
        Row: {
          calories: number | null
          carbs: number | null
          carbs_per_100g: number | null
          common_allergens: string[] | null
          created_at: string | null
          dietary_flags: string[] | null
          fats: number | null
          fats_per_100g: number | null
          fiber: number | null
          fiber_per_100g: number | null
          food_group: string | null
          food_group_id: number | null
          id: string
          meal_type: string[] | null
          name: string
          phase: number | null
          phase_id: number | null
          portion_size: number | null
          portion_unit: string | null
          post_workout_compatible: boolean | null
          pre_workout_compatible: boolean | null
          protein: number | null
          protein_per_100g: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          carbs_per_100g?: number | null
          common_allergens?: string[] | null
          created_at?: string | null
          dietary_flags?: string[] | null
          fats?: number | null
          fats_per_100g?: number | null
          fiber?: number | null
          fiber_per_100g?: number | null
          food_group?: string | null
          food_group_id?: number | null
          id?: string
          meal_type?: string[] | null
          name: string
          phase?: number | null
          phase_id?: number | null
          portion_size?: number | null
          portion_unit?: string | null
          post_workout_compatible?: boolean | null
          pre_workout_compatible?: boolean | null
          protein?: number | null
          protein_per_100g?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          carbs_per_100g?: number | null
          common_allergens?: string[] | null
          created_at?: string | null
          dietary_flags?: string[] | null
          fats?: number | null
          fats_per_100g?: number | null
          fiber?: number | null
          fiber_per_100g?: number | null
          food_group?: string | null
          food_group_id?: number | null
          id?: string
          meal_type?: string[] | null
          name?: string
          phase?: number | null
          phase_id?: number | null
          portion_size?: number | null
          portion_unit?: string | null
          post_workout_compatible?: boolean | null
          pre_workout_compatible?: boolean | null
          protein?: number | null
          protein_per_100g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_foods_food_group_id_fkey"
            columns: ["food_group_id"]
            isOneToOne: false
            referencedRelation: "food_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_foods_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "protocol_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_phases: {
        Row: {
          created_at: string | null
          day_end: number
          day_start: number
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          day_end: number
          day_start: number
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          day_end?: number
          day_start?: number
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      rehab_plans: {
        Row: {
          condition: string | null
          created_at: string | null
          end_date: string | null
          goal: string | null
          id: string
          joint_area: string | null
          plan_data: Json | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          joint_area?: string | null
          plan_data?: Json | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          joint_area?: string | null
          plan_data?: Json | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      step_rewards: {
        Row: {
          created_at: string | null
          id: string
          reward_amount: number | null
          reward_date: string
          steps_counted: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reward_amount?: number | null
          reward_date: string
          steps_counted?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reward_amount?: number | null
          reward_date?: string
          steps_counted?: number
          user_id?: string
        }
        Relationships: []
      }
      symptoms: {
        Row: {
          created_at: string | null
          discomfort_level: number | null
          has_abdominal_pain: boolean | null
          has_bloating: boolean | null
          has_gas: boolean | null
          has_nausea: boolean | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discomfort_level?: number | null
          has_abdominal_pain?: boolean | null
          has_bloating?: boolean | null
          has_gas?: boolean | null
          has_nausea?: boolean | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discomfort_level?: number | null
          has_abdominal_pain?: boolean | null
          has_bloating?: boolean | null
          has_gas?: boolean | null
          has_nausea?: boolean | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_modules: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          status: Database["public"]["Enums"]["status_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          module_id: string | null
          status: Database["public"]["Enums"]["status_type"] | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["status_type"] | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["status_type"] | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_qr_codes: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          expires_at: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          expires_at: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_workout_preferences: {
        Row: {
          activity_level: string | null
          age: number | null
          available_equipment: string[] | null
          created_at: string | null
          gender: string | null
          goal: string | null
          health_conditions: string[] | null
          height: number | null
          id: string
          preferred_exercise_types: string[] | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          available_equipment?: string[] | null
          created_at?: string | null
          gender?: string | null
          goal?: string | null
          health_conditions?: string[] | null
          height?: number | null
          id?: string
          preferred_exercise_types?: string[] | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          available_equipment?: string[] | null
          created_at?: string | null
          gender?: string | null
          goal?: string | null
          health_conditions?: string[] | null
          height?: number | null
          id?: string
          preferred_exercise_types?: string[] | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      water_intake: {
        Row: {
          amount_ml: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          created_at: string | null
          id: string
          plan_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_data: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_data?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role:
        | {
            Args: { _role: Database["public"]["Enums"]["app_role"] }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
    }
    Enums: {
      agent_type: "meal_plan" | "workout" | "physiotherapy" | "mental_health"
      app_role: "admin" | "moderator" | "user" | "personal"
      assessment_type: "burnout" | "anxiety" | "stress" | "depression"
      exercise_difficulty: "beginner" | "intermediate" | "advanced"
      exercise_type_enum: "strength" | "cardio" | "mobility"
      plan_type: "workout" | "nutrition" | "rehabilitation"
      resource_type: "emergency_contact" | "educational_content" | "useful_link"
      status_type: "active" | "inactive"
      transaction_type:
        | "daily_tip"
        | "water_intake"
        | "steps"
        | "meal_plan"
        | "workout_plan"
        | "physio_plan"
        | "transfer"
        | "steps_reward"
        | "water_reward"
        | "meal_plan_generation"
        | "workout_plan_generation"
        | "rehab_plan_generation"
        | "breathing_exercise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_type: ["meal_plan", "workout", "physiotherapy", "mental_health"],
      app_role: ["admin", "moderator", "user", "personal"],
      assessment_type: ["burnout", "anxiety", "stress", "depression"],
      exercise_difficulty: ["beginner", "intermediate", "advanced"],
      exercise_type_enum: ["strength", "cardio", "mobility"],
      plan_type: ["workout", "nutrition", "rehabilitation"],
      resource_type: [
        "emergency_contact",
        "educational_content",
        "useful_link",
      ],
      status_type: ["active", "inactive"],
      transaction_type: [
        "daily_tip",
        "water_intake",
        "steps",
        "meal_plan",
        "workout_plan",
        "physio_plan",
        "transfer",
        "steps_reward",
        "water_reward",
        "meal_plan_generation",
        "workout_plan_generation",
        "rehab_plan_generation",
        "breathing_exercise",
      ],
    },
  },
} as const
