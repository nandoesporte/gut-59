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
        Relationships: [
          {
            foreignKeyName: "meal_types_phase_fkey"
            columns: ["phase"]
            isOneToOne: false
            referencedRelation: "protocol_phases"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      profiles: {
        Row: {
          age: number | null
          health_conditions: string | null
          id: string
          name: string | null
        }
        Insert: {
          age?: number | null
          health_conditions?: string | null
          id: string
          name?: string | null
        }
        Update: {
          age?: number | null
          health_conditions?: string | null
          id?: string
          name?: string | null
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
          created_at: string | null
          food_group: string | null
          food_group_id: number | null
          id: string
          name: string
          phase: number | null
          phase_id: number | null
        }
        Insert: {
          created_at?: string | null
          food_group?: string | null
          food_group_id?: number | null
          id?: string
          name: string
          phase?: number | null
          phase_id?: number | null
        }
        Update: {
          created_at?: string | null
          food_group?: string | null
          food_group_id?: number | null
          id?: string
          name?: string
          phase?: number | null
          phase_id?: number | null
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
      water_intake: {
        Row: {
          amount_ml: number | null
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount_ml?: number | null
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount_ml?: number | null
          created_at?: string | null
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
