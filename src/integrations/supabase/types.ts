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
      exercises: {
        Row: {
          alternative_exercises: string[] | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"]
          equipment_needed: string[] | null
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          gif_url: string | null
          id: string
          max_reps: number
          max_sets: number
          min_reps: number
          min_sets: number
          muscle_group: Database["public"]["Enums"]["muscle_group"]
          name: string
          rest_time_seconds: number
          updated_at: string
        }
        Insert: {
          alternative_exercises?: string[] | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          equipment_needed?: string[] | null
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          gif_url?: string | null
          id?: string
          max_reps?: number
          max_sets?: number
          min_reps?: number
          min_sets?: number
          muscle_group: Database["public"]["Enums"]["muscle_group"]
          name: string
          rest_time_seconds?: number
          updated_at?: string
        }
        Update: {
          alternative_exercises?: string[] | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          equipment_needed?: string[] | null
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          gif_url?: string | null
          id?: string
          max_reps?: number
          max_sets?: number
          min_reps?: number
          min_sets?: number
          muscle_group?: Database["public"]["Enums"]["muscle_group"]
          name?: string
          rest_time_seconds?: number
          updated_at?: string
        }
        Relationships: []
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
          created_at: string | null
          dietary_preferences: string[] | null
          gender: string
          goal: Database["public"]["Enums"]["nutritional_goal"]
          health_condition:
            | Database["public"]["Enums"]["health_condition"]
            | null
          height: number
          id: string
          updated_at: string | null
          user_id: string
          weight: number
        }
        Insert: {
          activity_level: Database["public"]["Enums"]["activity_level"]
          age: number
          allergies?: string[] | null
          created_at?: string | null
          dietary_preferences?: string[] | null
          gender: string
          goal: Database["public"]["Enums"]["nutritional_goal"]
          health_condition?:
            | Database["public"]["Enums"]["health_condition"]
            | null
          height: number
          id?: string
          updated_at?: string | null
          user_id: string
          weight: number
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"]
          age?: number
          allergies?: string[] | null
          created_at?: string | null
          dietary_preferences?: string[] | null
          gender?: string
          goal?: Database["public"]["Enums"]["nutritional_goal"]
          health_condition?:
            | Database["public"]["Enums"]["health_condition"]
            | null
          height?: number
          id?: string
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
          daily_water_goal_ml: number | null
          health_conditions: string | null
          height: number | null
          id: string
          name: string | null
          photo_url: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          daily_water_goal_ml?: number | null
          health_conditions?: string | null
          height?: number | null
          id: string
          name?: string | null
          photo_url?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          daily_water_goal_ml?: number | null
          health_conditions?: string | null
          height?: number | null
          id?: string
          name?: string | null
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
        Args: {
          user_weight: number
          user_height: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      update_user_water_goal: {
        Args: {
          p_user_id: string
          p_weight: number
          p_height: number
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_level: "sedentary" | "light" | "moderate" | "intense"
      app_role: "admin" | "user" | "personal"
      exercise_difficulty: "beginner" | "intermediate" | "advanced"
      exercise_type: "strength" | "cardio" | "mobility"
      health_condition: "hypertension" | "diabetes" | "depression_anxiety"
      message_type: "nutricionista" | "personal"
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
      nutritional_goal: "lose_weight" | "maintain" | "gain_mass"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
