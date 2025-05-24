export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_agent_prompts: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
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
          agent_type: Database["public"]["Enums"]["agent_type"]
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
          agent_type?: Database["public"]["Enums"]["agent_type"]
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
          active_model: string
          created_at: string | null
          groq_api_key: string | null
          id: string
          name: string
          system_prompt: string
          updated_at: string | null
          use_custom_prompt: boolean
          xai_api_key: string | null
        }
        Insert: {
          active_model?: string
          created_at?: string | null
          groq_api_key?: string | null
          id?: string
          name: string
          system_prompt: string
          updated_at?: string | null
          use_custom_prompt?: boolean
          xai_api_key?: string | null
        }
        Update: {
          active_model?: string
          created_at?: string | null
          groq_api_key?: string | null
          id?: string
          name?: string
          system_prompt?: string
          updated_at?: string | null
          use_custom_prompt?: boolean
          xai_api_key?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          max_uses: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          max_uses?: number | null
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          max_uses?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      daily_tips: {
        Row: {
          content: string
          created_at: string
          id: number
          theme: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          theme?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          theme?: string | null
        }
        Relationships: []
      }
      dietary_preferences: {
        Row: {
          allergies: string[] | null
          created_at: string | null
          dietary_restrictions: string[] | null
          has_allergies: boolean | null
          id: string
          training_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          created_at?: string | null
          dietary_restrictions?: string[] | null
          has_allergies?: boolean | null
          id?: string
          training_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          created_at?: string | null
          dietary_restrictions?: string[] | null
          has_allergies?: boolean | null
          id?: string
          training_time?: string | null
          updated_at?: string | null
          user_id?: string
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
        Relationships: [
          {
            foreignKeyName: "education_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_logs: {
        Row: {
          created_at: string
          emotion: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emotion: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emotion?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          advanced_weight: string | null
          alternative_exercises: string[] | null
          balance_requirement: string | null
          beginner_weight: string | null
          breathing_pattern: string | null
          calories_burned_per_hour: number | null
          common_mistakes: string[] | null
          contraindicated_conditions: string[] | null
          coordination_requirement: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"]
          equipment_complexity: string | null
          equipment_needed: string[] | null
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          flexibility_requirement: string | null
          gif_url: string | null
          goals: string[] | null
          id: string
          is_compound_movement: boolean | null
          is_video: boolean | null
          max_reps: number
          max_sets: number
          min_reps: number
          min_sets: number
          mobility_requirements: string | null
          moderate_weight: string | null
          movement_pattern: string | null
          muscle_group: Database["public"]["Enums"]["muscle_group"]
          name: string
          power_requirement: string | null
          preparation_time_minutes: number | null
          primary_muscles_worked: string[] | null
          progression_variations: string[] | null
          recommended_warm_up: string | null
          regression_variations: string[] | null
          rest_time_seconds: number
          safety_considerations: string[] | null
          secondary_muscles_worked: string[] | null
          stability_requirement: string | null
          suitable_for_conditions: string[] | null
          target_heart_rate_zone: string[] | null
          tempo_recommendation: string | null
          training_phases: string[] | null
          typical_duration_seconds: number | null
          updated_at: string
        }
        Insert: {
          advanced_weight?: string | null
          alternative_exercises?: string[] | null
          balance_requirement?: string | null
          beginner_weight?: string | null
          breathing_pattern?: string | null
          calories_burned_per_hour?: number | null
          common_mistakes?: string[] | null
          contraindicated_conditions?: string[] | null
          coordination_requirement?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          equipment_complexity?: string | null
          equipment_needed?: string[] | null
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          flexibility_requirement?: string | null
          gif_url?: string | null
          goals?: string[] | null
          id?: string
          is_compound_movement?: boolean | null
          is_video?: boolean | null
          max_reps?: number
          max_sets?: number
          min_reps?: number
          min_sets?: number
          mobility_requirements?: string | null
          moderate_weight?: string | null
          movement_pattern?: string | null
          muscle_group: Database["public"]["Enums"]["muscle_group"]
          name: string
          power_requirement?: string | null
          preparation_time_minutes?: number | null
          primary_muscles_worked?: string[] | null
          progression_variations?: string[] | null
          recommended_warm_up?: string | null
          regression_variations?: string[] | null
          rest_time_seconds?: number
          safety_considerations?: string[] | null
          secondary_muscles_worked?: string[] | null
          stability_requirement?: string | null
          suitable_for_conditions?: string[] | null
          target_heart_rate_zone?: string[] | null
          tempo_recommendation?: string | null
          training_phases?: string[] | null
          typical_duration_seconds?: number | null
          updated_at?: string
        }
        Update: {
          advanced_weight?: string | null
          alternative_exercises?: string[] | null
          balance_requirement?: string | null
          beginner_weight?: string | null
          breathing_pattern?: string | null
          calories_burned_per_hour?: number | null
          common_mistakes?: string[] | null
          contraindicated_conditions?: string[] | null
          coordination_requirement?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          equipment_complexity?: string | null
          equipment_needed?: string[] | null
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          flexibility_requirement?: string | null
          gif_url?: string | null
          goals?: string[] | null
          id?: string
          is_compound_movement?: boolean | null
          is_video?: boolean | null
          max_reps?: number
          max_sets?: number
          min_reps?: number
          min_sets?: number
          mobility_requirements?: string | null
          moderate_weight?: string | null
          movement_pattern?: string | null
          muscle_group?: Database["public"]["Enums"]["muscle_group"]
          name?: string
          power_requirement?: string | null
          preparation_time_minutes?: number | null
          primary_muscles_worked?: string[] | null
          progression_variations?: string[] | null
          recommended_warm_up?: string | null
          regression_variations?: string[] | null
          rest_time_seconds?: number
          safety_considerations?: string[] | null
          secondary_muscles_worked?: string[] | null
          stability_requirement?: string | null
          suitable_for_conditions?: string[] | null
          target_heart_rate_zone?: string[] | null
          tempo_recommendation?: string | null
          training_phases?: string[] | null
          typical_duration_seconds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          qr_code_id: string | null
          recipient_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          qr_code_id?: string | null
          recipient_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          qr_code_id?: string | null
          recipient_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
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
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      health_assessments: {
        Row: {
          assessment_type: string
          created_at: string
          id: string
          responses: Json
          score: number
          user_id: string
        }
        Insert: {
          assessment_type: string
          created_at?: string
          id?: string
          responses: Json
          score: number
          user_id: string
        }
        Update: {
          assessment_type?: string
          created_at?: string
          id?: string
          responses?: Json
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      meal_guidelines: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          meal_type: string
          min_items: number
          required_categories: string[]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          meal_type: string
          min_items: number
          required_categories: string[]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          meal_type?: string
          min_items?: number
          required_categories?: string[]
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          active: boolean | null
          calories: number | null
          created_at: string | null
          dietary_preferences: Json | null
          id: string
          macros: Json | null
          plan_data: Json
          training_time: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          calories?: number | null
          created_at?: string | null
          dietary_preferences?: Json | null
          id?: string
          macros?: Json | null
          plan_data: Json
          training_time?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          calories?: number | null
          created_at?: string | null
          dietary_preferences?: Json | null
          id?: string
          macros?: Json | null
          plan_data?: Json
          training_time?: string | null
          user_id?: string
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
            foreignKeyName: "meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_settings: {
        Row: {
          breathing_exercise_daily_limit: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          breathing_exercise_daily_limit?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          breathing_exercise_daily_limit?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      mental_modules: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          status: Database["public"]["Enums"]["mental_video_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          name: string
          status?: Database["public"]["Enums"]["mental_video_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["mental_video_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      mental_resources: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          phone_number: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          status: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          phone_number?: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          status?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          phone_number?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          status?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      mental_videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string | null
          status: Database["public"]["Enums"]["mental_video_status"] | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["mental_video_status"] | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["mental_video_status"] | null
          title?: string
          updated_at?: string
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
          created_at: string
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          caloric_needs: number
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          meal_plan: Json
          start_date: string | null
          user_id: string
        }
        Insert: {
          caloric_needs: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          meal_plan: Json
          start_date?: string | null
          user_id: string
        }
        Update: {
          caloric_needs?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          meal_plan?: Json
          start_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_preferences: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          age: number
          allergies: string[] | null
          calories_needed: number | null
          created_at: string | null
          dietary_preferences: string[] | null
          gender: string
          goal: Database["public"]["Enums"]["nutritional_goal"]
          health_condition:
            | Database["public"]["Enums"]["health_condition"]
            | null
          height: number
          id: string
          selected_foods: string[] | null
          updated_at: string | null
          user_id: string
          weight: number
        }
        Insert: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          age: number
          allergies?: string[] | null
          calories_needed?: number | null
          created_at?: string | null
          dietary_preferences?: string[] | null
          gender: string
          goal: Database["public"]["Enums"]["nutritional_goal"]
          health_condition?:
            | Database["public"]["Enums"]["health_condition"]
            | null
          height: number
          id?: string
          selected_foods?: string[] | null
          updated_at?: string | null
          user_id: string
          weight: number
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"]
          age?: number
          allergies?: string[] | null
          calories_needed?: number | null
          created_at?: string | null
          dietary_preferences?: string[] | null
          gender?: string
          goal?: Database["public"]["Enums"]["nutritional_goal"]
          health_condition?:
            | Database["public"]["Enums"]["health_condition"]
            | null
          height?: number
          id?: string
          selected_foods?: string[] | null
          updated_at?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          price: number
          product_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          payment_id: string | null
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id?: string | null
          status?: string
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_notifications: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          read: boolean | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          read?: boolean | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          read?: boolean | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      physio_exercises: {
        Row: {
          acute_phase_suitable: boolean | null
          alternative_names: string[] | null
          balance_requirement: string | null
          condition: Database["public"]["Enums"]["physio_condition"]
          contraindications: string[] | null
          coordination_requirement: string | null
          created_at: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"]
          difficulty_progression_path: string[] | null
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          flexibility_requirement: string | null
          gif_url: string | null
          hold_time_seconds: number | null
          id: string
          is_compound_movement: boolean | null
          is_video: boolean | null
          joint_area: Database["public"]["Enums"]["physio_joint_area"]
          keywords: string[] | null
          maintenance_phase_suitable: boolean | null
          modified_positions: string[] | null
          movement_plane: string[] | null
          movement_speed: string | null
          name: string
          objective_measures: string[] | null
          pain_level_threshold: number | null
          precautions: string[] | null
          primary_goals: string[] | null
          progression_level: number | null
          recommended_repetitions: number | null
          recommended_sets: number | null
          rehabilitation_phase_suitable: boolean | null
          related_exercises: string[] | null
          required_equipment: string[] | null
          resistance_level: string | null
          rest_time_seconds: number | null
          rom_requirements: string[] | null
          secondary_goals: string[] | null
          setup_instructions: string | null
          space_requirement: string | null
          strength_requirement: string | null
          success_indicators: string[] | null
          target_symptoms: string[] | null
          updated_at: string | null
        }
        Insert: {
          acute_phase_suitable?: boolean | null
          alternative_names?: string[] | null
          balance_requirement?: string | null
          condition: Database["public"]["Enums"]["physio_condition"]
          contraindications?: string[] | null
          coordination_requirement?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          difficulty_progression_path?: string[] | null
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          flexibility_requirement?: string | null
          gif_url?: string | null
          hold_time_seconds?: number | null
          id?: string
          is_compound_movement?: boolean | null
          is_video?: boolean | null
          joint_area: Database["public"]["Enums"]["physio_joint_area"]
          keywords?: string[] | null
          maintenance_phase_suitable?: boolean | null
          modified_positions?: string[] | null
          movement_plane?: string[] | null
          movement_speed?: string | null
          name: string
          objective_measures?: string[] | null
          pain_level_threshold?: number | null
          precautions?: string[] | null
          primary_goals?: string[] | null
          progression_level?: number | null
          recommended_repetitions?: number | null
          recommended_sets?: number | null
          rehabilitation_phase_suitable?: boolean | null
          related_exercises?: string[] | null
          required_equipment?: string[] | null
          resistance_level?: string | null
          rest_time_seconds?: number | null
          rom_requirements?: string[] | null
          secondary_goals?: string[] | null
          setup_instructions?: string | null
          space_requirement?: string | null
          strength_requirement?: string | null
          success_indicators?: string[] | null
          target_symptoms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          acute_phase_suitable?: boolean | null
          alternative_names?: string[] | null
          balance_requirement?: string | null
          condition?: Database["public"]["Enums"]["physio_condition"]
          contraindications?: string[] | null
          coordination_requirement?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          difficulty_progression_path?: string[] | null
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          flexibility_requirement?: string | null
          gif_url?: string | null
          hold_time_seconds?: number | null
          id?: string
          is_compound_movement?: boolean | null
          is_video?: boolean | null
          joint_area?: Database["public"]["Enums"]["physio_joint_area"]
          keywords?: string[] | null
          maintenance_phase_suitable?: boolean | null
          modified_positions?: string[] | null
          movement_plane?: string[] | null
          movement_speed?: string | null
          name?: string
          objective_measures?: string[] | null
          pain_level_threshold?: number | null
          precautions?: string[] | null
          primary_goals?: string[] | null
          progression_level?: number | null
          recommended_repetitions?: number | null
          recommended_sets?: number | null
          rehabilitation_phase_suitable?: boolean | null
          related_exercises?: string[] | null
          required_equipment?: string[] | null
          resistance_level?: string | null
          rest_time_seconds?: number | null
          rom_requirements?: string[] | null
          secondary_goals?: string[] | null
          setup_instructions?: string | null
          space_requirement?: string | null
          strength_requirement?: string | null
          success_indicators?: string[] | null
          target_symptoms?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plan_access: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          payment_required: boolean | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          payment_required?: boolean | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          payment_required?: boolean | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_generation_counts: {
        Row: {
          created_at: string
          id: string
          nutrition_count: number | null
          rehabilitation_count: number | null
          updated_at: string
          user_id: string | null
          workout_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          nutrition_count?: number | null
          rehabilitation_count?: number | null
          updated_at?: string
          user_id?: string | null
          workout_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          nutrition_count?: number | null
          rehabilitation_count?: number | null
          updated_at?: string
          user_id?: string | null
          workout_count?: number | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          price: number
          stock: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          price: number
          stock?: number | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          price?: number
          stock?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          photo_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          photo_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          photo_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          cpf: string | null
          daily_water_goal_ml: number | null
          email: string | null
          health_conditions: string | null
          height: number | null
          id: string
          name: string | null
          phone_number: string | null
          photo_url: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          cpf?: string | null
          daily_water_goal_ml?: number | null
          email?: string | null
          health_conditions?: string | null
          height?: number | null
          id: string
          name?: string | null
          phone_number?: string | null
          photo_url?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          cpf?: string | null
          daily_water_goal_ml?: number | null
          email?: string | null
          health_conditions?: string | null
          height?: number | null
          id?: string
          name?: string | null
          phone_number?: string | null
          photo_url?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      protocol_days: {
        Row: {
          content: string
          created_at: string
          day: number
          description: string | null
          id: number
          phase_id: number
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          day: number
          description?: string | null
          id?: number
          phase_id: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          day?: number
          description?: string | null
          id?: number
          phase_id?: number
          title?: string
          updated_at?: string
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
          calories: number
          carbs: number | null
          carbs_per_100g: number | null
          common_allergens: string[] | null
          created_at: string
          dietary_flags: string[] | null
          fats: number | null
          fats_per_100g: number | null
          fiber: number | null
          fiber_per_100g: number | null
          food_category: string[] | null
          food_group_id: number | null
          glycemic_index: number | null
          id: string
          is_quick_meal: boolean | null
          max_portion: number | null
          meal_type: string[] | null
          min_portion: number | null
          minerals: Json | null
          name: string
          nutritional_category: string[] | null
          phase: number | null
          portion_size: number | null
          portion_unit: string | null
          post_workout_compatible: boolean | null
          pre_workout_compatible: boolean | null
          preparation_time_minutes: number | null
          protein: number | null
          protein_per_100g: number | null
          serving_size: number | null
          serving_unit: string | null
          vitamins: Json | null
        }
        Insert: {
          calories: number
          carbs?: number | null
          carbs_per_100g?: number | null
          common_allergens?: string[] | null
          created_at?: string
          dietary_flags?: string[] | null
          fats?: number | null
          fats_per_100g?: number | null
          fiber?: number | null
          fiber_per_100g?: number | null
          food_category?: string[] | null
          food_group_id?: number | null
          glycemic_index?: number | null
          id?: string
          is_quick_meal?: boolean | null
          max_portion?: number | null
          meal_type?: string[] | null
          min_portion?: number | null
          minerals?: Json | null
          name: string
          nutritional_category?: string[] | null
          phase?: number | null
          portion_size?: number | null
          portion_unit?: string | null
          post_workout_compatible?: boolean | null
          pre_workout_compatible?: boolean | null
          preparation_time_minutes?: number | null
          protein?: number | null
          protein_per_100g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          vitamins?: Json | null
        }
        Update: {
          calories?: number
          carbs?: number | null
          carbs_per_100g?: number | null
          common_allergens?: string[] | null
          created_at?: string
          dietary_flags?: string[] | null
          fats?: number | null
          fats_per_100g?: number | null
          fiber?: number | null
          fiber_per_100g?: number | null
          food_category?: string[] | null
          food_group_id?: number | null
          glycemic_index?: number | null
          id?: string
          is_quick_meal?: boolean | null
          max_portion?: number | null
          meal_type?: string[] | null
          min_portion?: number | null
          minerals?: Json | null
          name?: string
          nutritional_category?: string[] | null
          phase?: number | null
          portion_size?: number | null
          portion_unit?: string | null
          post_workout_compatible?: boolean | null
          pre_workout_compatible?: boolean | null
          preparation_time_minutes?: number | null
          protein?: number | null
          protein_per_100g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          vitamins?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_food_group"
            columns: ["food_group_id"]
            isOneToOne: false
            referencedRelation: "food_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_foods_food_group_id_fkey"
            columns: ["food_group_id"]
            isOneToOne: false
            referencedRelation: "food_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_phases: {
        Row: {
          day_end: number
          day_start: number
          description: string | null
          id: number
          name: string
        }
        Insert: {
          day_end: number
          day_start: number
          description?: string | null
          id?: number
          name: string
        }
        Update: {
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
          condition: Database["public"]["Enums"]["condition_type"]
          created_at: string
          end_date: string
          goal: Database["public"]["Enums"]["rehab_goal"]
          id: string
          joint_area: Database["public"]["Enums"]["joint_area"]
          plan_data: Json | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          condition: Database["public"]["Enums"]["condition_type"]
          created_at?: string
          end_date: string
          goal: Database["public"]["Enums"]["rehab_goal"]
          id?: string
          joint_area: Database["public"]["Enums"]["joint_area"]
          plan_data?: Json | null
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: Database["public"]["Enums"]["condition_type"]
          created_at?: string
          end_date?: string
          goal?: Database["public"]["Enums"]["rehab_goal"]
          id?: string
          joint_area?: Database["public"]["Enums"]["joint_area"]
          plan_data?: Json | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rehab_progress: {
        Row: {
          created_at: string
          date: string
          difficulty_rating: number | null
          exercise_id: string | null
          id: string
          notes: string | null
          pain_level: number | null
          reps_completed: number
          session_id: string | null
          sets_completed: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          difficulty_rating?: number | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          pain_level?: number | null
          reps_completed: number
          session_id?: string | null
          sets_completed: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          difficulty_rating?: number | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          pain_level?: number | null
          reps_completed?: number
          session_id?: string | null
          sets_completed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rehab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rehab_session_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          order_in_session: number
          reps: number
          rest_time_seconds: number
          session_id: string
          sets: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          order_in_session: number
          reps: number
          rest_time_seconds?: number
          session_id: string
          sets: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          order_in_session?: number
          reps?: number
          rest_time_seconds?: number
          session_id?: string
          sets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rehab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rehab_sessions: {
        Row: {
          cooldown_description: string
          created_at: string
          day_number: number
          id: string
          plan_id: string
          updated_at: string
          warmup_description: string
        }
        Insert: {
          cooldown_description: string
          created_at?: string
          day_number: number
          id?: string
          plan_id: string
          updated_at?: string
          warmup_description: string
        }
        Update: {
          cooldown_description?: string
          created_at?: string
          day_number?: number
          id?: string
          plan_id?: string
          updated_at?: string
          warmup_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "rehab_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          id: string
          order_in_session: number
          reps: number
          rest_time_seconds: number
          session_id: string | null
          sets: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          order_in_session: number
          reps: number
          rest_time_seconds: number
          session_id?: string | null
          sets: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          order_in_session?: number
          reps?: number
          rest_time_seconds?: number
          session_id?: string | null
          sets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      step_rewards: {
        Row: {
          created_at: string
          id: string
          reward_date: string
          steps: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_date?: string
          steps: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_date?: string
          steps?: number
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptoms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          status: Database["public"]["Enums"]["module_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          name: string
          status?: Database["public"]["Enums"]["module_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["module_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string | null
          status: Database["public"]["Enums"]["module_status"] | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["module_status"] | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["module_status"] | null
          title?: string
          updated_at?: string
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
      transfer_requests: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          recipient_identifier: string
          sender_id: string
          status: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          recipient_identifier: string
          sender_id: string
          status?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          recipient_identifier?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          body_fat: number | null
          created_at: string | null
          date: string | null
          digestive_issues: string[] | null
          energy_level: number | null
          feedback: string | null
          id: string
          muscle_mass: number | null
          user_id: string
          waist_circumference: number | null
          weight: number | null
        }
        Insert: {
          body_fat?: number | null
          created_at?: string | null
          date?: string | null
          digestive_issues?: string[] | null
          energy_level?: number | null
          feedback?: string | null
          id?: string
          muscle_mass?: number | null
          user_id: string
          waist_circumference?: number | null
          weight?: number | null
        }
        Update: {
          body_fat?: number | null
          created_at?: string | null
          date?: string | null
          digestive_issues?: string[] | null
          energy_level?: number | null
          feedback?: string | null
          id?: string
          muscle_mass?: number | null
          user_id?: string
          waist_circumference?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_workout_preferences: {
        Row: {
          activity_level: string
          age: number
          available_equipment: string[] | null
          created_at: string
          gender: string
          goal: string
          health_conditions: string[] | null
          height: number
          id: string
          preferred_exercise_types:
            | Database["public"]["Enums"]["exercise_type"][]
            | null
          updated_at: string
          user_id: string | null
          weight: number
        }
        Insert: {
          activity_level: string
          age: number
          available_equipment?: string[] | null
          created_at?: string
          gender: string
          goal: string
          health_conditions?: string[] | null
          height: number
          id?: string
          preferred_exercise_types?:
            | Database["public"]["Enums"]["exercise_type"][]
            | null
          updated_at?: string
          user_id?: string | null
          weight: number
        }
        Update: {
          activity_level?: string
          age?: number
          available_equipment?: string[] | null
          created_at?: string
          gender?: string
          goal?: string
          health_conditions?: string[] | null
          height?: number
          id?: string
          preferred_exercise_types?:
            | Database["public"]["Enums"]["exercise_type"][]
            | null
          updated_at?: string
          user_id?: string | null
          weight?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_intake: {
        Row: {
          amount_ml: number | null
          created_at: string | null
          id: string
          intake_date: string
          user_id: string
        }
        Insert: {
          amount_ml?: number | null
          created_at?: string | null
          id?: string
          intake_date?: string
          user_id: string
        }
        Update: {
          amount_ml?: number | null
          created_at?: string | null
          id?: string
          intake_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_intake_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          end_date: string
          goal: string
          id: string
          start_date: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          end_date: string
          goal: string
          id?: string
          start_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string
          goal?: string
          id?: string
          start_date?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workout_progress: {
        Row: {
          created_at: string
          date: string
          difficulty_rating: number | null
          exercise_id: string | null
          id: string
          notes: string | null
          reps_completed: number
          session_id: string | null
          sets_completed: number
          user_id: string | null
          weight_used: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          difficulty_rating?: number | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          reps_completed: number
          session_id?: string | null
          sets_completed: number
          user_id?: string | null
          weight_used?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          difficulty_rating?: number | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          reps_completed?: number
          session_id?: string | null
          sets_completed?: number
          user_id?: string | null
          weight_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          cooldown_description: string
          created_at: string
          day_number: number
          id: string
          plan_id: string | null
          updated_at: string
          warmup_description: string
        }
        Insert: {
          cooldown_description: string
          created_at?: string
          day_number: number
          id?: string
          plan_id?: string | null
          updated_at?: string
          warmup_description: string
        }
        Update: {
          cooldown_description?: string
          created_at?: string
          day_number?: number
          id?: string
          plan_id?: string | null
          updated_at?: string
          warmup_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_daily_water_goal: {
        Args: { user_weight: number; user_height: number }
        Returns: number
      }
      get_payment_setting: {
        Args: { setting_name_param: string }
        Returns: boolean
      }
      grant_plan_access: {
        Args: { p_user_id: string; p_plan_type: string }
        Returns: undefined
      }
      has_role: {
        Args: { role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      process_transfer: {
        Args: {
          sender_wallet_id: string
          recipient_wallet_id: string
          transfer_amount: number
          description?: string
        }
        Returns: boolean
      }
      reset_daily_water_intake: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_dietary_preferences: {
        Args: {
          p_user_id: string
          p_has_allergies: boolean
          p_allergies: string[]
          p_dietary_restrictions: string[]
          p_training_time: string
        }
        Returns: undefined
      }
      update_nutrition_preferences: {
        Args: { p_user_id: string; p_data: Json }
        Returns: undefined
      }
      update_nutrition_selected_foods: {
        Args: { p_user_id: string; p_selected_foods: string[] }
        Returns: undefined
      }
      update_user_water_goal: {
        Args: { p_user_id: string; p_weight: number; p_height: number }
        Returns: undefined
      }
    }
    Enums: {
      activity_level: "sedentary" | "light" | "moderate" | "intense"
      agent_type: "meal_plan" | "workout" | "physiotherapy" | "mental_health"
      app_role: "admin" | "user" | "personal"
      condition_type:
        | "plantar_fasciitis"
        | "calcaneal_spur"
        | "ankle_sprain"
        | "anterior_compartment"
        | "shin_splints"
        | "achilles_tendinitis"
        | "patellofemoral"
        | "patellar_tendinitis"
        | "acl_postop"
        | "mcl_injury"
        | "meniscus_injury"
        | "knee_arthrosis"
        | "trochanteric_bursitis"
        | "piriformis_syndrome"
        | "sports_hernia"
        | "it_band_syndrome"
        | "disc_protrusion"
        | "herniated_disc"
        | "cervical_lordosis"
        | "frozen_shoulder"
        | "shoulder_bursitis"
        | "rotator_cuff"
        | "impingement"
        | "medial_epicondylitis"
        | "lateral_epicondylitis"
        | "carpal_tunnel"
      exercise_difficulty: "beginner" | "intermediate" | "advanced"
      exercise_type: "strength" | "cardio" | "mobility"
      health_condition: "hypertension" | "diabetes" | "depression_anxiety"
      joint_area:
        | "ankle_foot"
        | "leg"
        | "knee"
        | "hip"
        | "spine"
        | "shoulder"
        | "elbow_hand"
      mental_video_status: "active" | "inactive"
      message_type: "nutricionista" | "personal" | "mental_health"
      module_status: "active" | "inactive"
      muscle_group:
        | "chest"
        | "back"
        | "legs"
        | "shoulders"
        | "arms"
        | "core"
        | "full_body"
        | "cardio"
        | "mobility"
        | "weight_training"
        | "stretching"
        | "ball_exercises"
        | "resistance_band"
      nutritional_goal: "lose_weight" | "maintain" | "gain_mass"
      physio_condition:
        | "plantar_fasciitis"
        | "calcaneal_spur"
        | "ankle_sprain"
        | "anterior_compartment"
        | "shin_splints"
        | "achilles_tendinitis"
        | "patellofemoral"
        | "patellar_tendinitis"
        | "acl_postop"
        | "mcl_injury"
        | "meniscus_injury"
        | "knee_arthrosis"
        | "trochanteric_bursitis"
        | "piriformis_syndrome"
        | "sports_hernia"
        | "it_band_syndrome"
        | "disc_protrusion"
        | "herniated_disc"
        | "cervical_lordosis"
        | "frozen_shoulder"
        | "shoulder_bursitis"
        | "rotator_cuff"
        | "impingement"
        | "medial_epicondylitis"
        | "lateral_epicondylitis"
        | "carpal_tunnel"
      physio_joint_area:
        | "ankle_foot"
        | "leg"
        | "knee"
        | "hip"
        | "spine"
        | "shoulder"
        | "elbow_hand"
      plan_type: "workout" | "nutrition" | "rehabilitation"
      rehab_goal: "pain_relief" | "mobility" | "strength" | "return_to_sport"
      resource_type: "emergency_contact" | "educational_content" | "useful_link"
      training_goal: "lose_weight" | "maintain" | "gain_mass"
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
      workout_goal: "lose_weight" | "maintain" | "gain_mass"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_level: ["sedentary", "light", "moderate", "intense"],
      agent_type: ["meal_plan", "workout", "physiotherapy", "mental_health"],
      app_role: ["admin", "user", "personal"],
      condition_type: [
        "plantar_fasciitis",
        "calcaneal_spur",
        "ankle_sprain",
        "anterior_compartment",
        "shin_splints",
        "achilles_tendinitis",
        "patellofemoral",
        "patellar_tendinitis",
        "acl_postop",
        "mcl_injury",
        "meniscus_injury",
        "knee_arthrosis",
        "trochanteric_bursitis",
        "piriformis_syndrome",
        "sports_hernia",
        "it_band_syndrome",
        "disc_protrusion",
        "herniated_disc",
        "cervical_lordosis",
        "frozen_shoulder",
        "shoulder_bursitis",
        "rotator_cuff",
        "impingement",
        "medial_epicondylitis",
        "lateral_epicondylitis",
        "carpal_tunnel",
      ],
      exercise_difficulty: ["beginner", "intermediate", "advanced"],
      exercise_type: ["strength", "cardio", "mobility"],
      health_condition: ["hypertension", "diabetes", "depression_anxiety"],
      joint_area: [
        "ankle_foot",
        "leg",
        "knee",
        "hip",
        "spine",
        "shoulder",
        "elbow_hand",
      ],
      mental_video_status: ["active", "inactive"],
      message_type: ["nutricionista", "personal", "mental_health"],
      module_status: ["active", "inactive"],
      muscle_group: [
        "chest",
        "back",
        "legs",
        "shoulders",
        "arms",
        "core",
        "full_body",
        "cardio",
        "mobility",
        "weight_training",
        "stretching",
        "ball_exercises",
        "resistance_band",
      ],
      nutritional_goal: ["lose_weight", "maintain", "gain_mass"],
      physio_condition: [
        "plantar_fasciitis",
        "calcaneal_spur",
        "ankle_sprain",
        "anterior_compartment",
        "shin_splints",
        "achilles_tendinitis",
        "patellofemoral",
        "patellar_tendinitis",
        "acl_postop",
        "mcl_injury",
        "meniscus_injury",
        "knee_arthrosis",
        "trochanteric_bursitis",
        "piriformis_syndrome",
        "sports_hernia",
        "it_band_syndrome",
        "disc_protrusion",
        "herniated_disc",
        "cervical_lordosis",
        "frozen_shoulder",
        "shoulder_bursitis",
        "rotator_cuff",
        "impingement",
        "medial_epicondylitis",
        "lateral_epicondylitis",
        "carpal_tunnel",
      ],
      physio_joint_area: [
        "ankle_foot",
        "leg",
        "knee",
        "hip",
        "spine",
        "shoulder",
        "elbow_hand",
      ],
      plan_type: ["workout", "nutrition", "rehabilitation"],
      rehab_goal: ["pain_relief", "mobility", "strength", "return_to_sport"],
      resource_type: [
        "emergency_contact",
        "educational_content",
        "useful_link",
      ],
      training_goal: ["lose_weight", "maintain", "gain_mass"],
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
      workout_goal: ["lose_weight", "maintain", "gain_mass"],
    },
  },
} as const
