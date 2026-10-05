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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          group_id: string | null
          household_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          household_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_group_fkey"
            columns: ["group_id", "household_id"]
            isOneToOne: false
            referencedRelation: "category_groups"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      category_groups: {
        Row: {
          created_at: string
          household_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_groups_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_history: {
        Row: {
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          id: string
          kcal: number
          protein_g: number | null
          user_id: string
          valid_from: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          kcal: number
          protein_g?: number | null
          user_id: string
          valid_from: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          kcal?: number
          protein_g?: number | null
          user_id?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          brand: string | null
          carbs_100: number | null
          carbs_unit: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          fat_100: number | null
          fat_unit: number | null
          fiber_100: number | null
          fiber_unit: number | null
          household_id: string
          id: string
          kcal_100: number | null
          kcal_unit: number | null
          legacy_id: string | null
          name: string
          note: string | null
          protein_100: number | null
          protein_unit: number | null
          salt_100: number | null
          salt_unit: number | null
          sat_fat_100: number | null
          sat_fat_unit: number | null
          sugar_100: number | null
          sugar_unit: number | null
          unit_label: string | null
          unit_weight_g: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          carbs_100?: number | null
          carbs_unit?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          fat_100?: number | null
          fat_unit?: number | null
          fiber_100?: number | null
          fiber_unit?: number | null
          household_id: string
          id?: string
          kcal_100?: number | null
          kcal_unit?: number | null
          legacy_id?: string | null
          name: string
          note?: string | null
          protein_100?: number | null
          protein_unit?: number | null
          salt_100?: number | null
          salt_unit?: number | null
          sat_fat_100?: number | null
          sat_fat_unit?: number | null
          sugar_100?: number | null
          sugar_unit?: number | null
          unit_label?: string | null
          unit_weight_g?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          carbs_100?: number | null
          carbs_unit?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          fat_100?: number | null
          fat_unit?: number | null
          fiber_100?: number | null
          fiber_unit?: number | null
          household_id?: string
          id?: string
          kcal_100?: number | null
          kcal_unit?: number | null
          legacy_id?: string | null
          name?: string
          note?: string | null
          protein_100?: number | null
          protein_unit?: number | null
          salt_100?: number | null
          salt_unit?: number | null
          sat_fat_100?: number | null
          sat_fat_unit?: number | null
          sugar_100?: number | null
          sugar_unit?: number | null
          unit_label?: string | null
          unit_weight_g?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_category_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "ingredients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_items: {
        Row: {
          basis: Database["public"]["Enums"]["nutrition_basis"]
          basis_multiplier: number
          brand: string | null
          carbs: number | null
          created_at: string
          entered_amount: number
          entered_unit: Database["public"]["Enums"]["amount_unit"]
          fat: number | null
          fiber: number | null
          id: string
          ingredient_id: string | null
          kcal: number
          meal_id: string
          name: string
          protein: number | null
          salt: number | null
          sat_fat: number | null
          sugar: number | null
          updated_at: string
        }
        Insert: {
          basis: Database["public"]["Enums"]["nutrition_basis"]
          basis_multiplier: number
          brand?: string | null
          carbs?: number | null
          created_at?: string
          entered_amount: number
          entered_unit: Database["public"]["Enums"]["amount_unit"]
          fat?: number | null
          fiber?: number | null
          id?: string
          ingredient_id?: string | null
          kcal: number
          meal_id: string
          name: string
          protein?: number | null
          salt?: number | null
          sat_fat?: number | null
          sugar?: number | null
          updated_at?: string
        }
        Update: {
          basis?: Database["public"]["Enums"]["nutrition_basis"]
          basis_multiplier?: number
          brand?: string | null
          carbs?: number | null
          created_at?: string
          entered_amount?: number
          entered_unit?: Database["public"]["Enums"]["amount_unit"]
          fat?: number | null
          fiber?: number | null
          id?: string
          ingredient_id?: string | null
          kcal?: number
          meal_id?: string
          name?: string
          protein?: number | null
          salt?: number | null
          sat_fat?: number | null
          sugar?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meal_totals"
            referencedColumns: ["meal_id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          date: string
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          updated_at?: string
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
      profiles: {
        Row: {
          accent_color: string
          appearance: Json
          created_at: string
          display_name: string
          household_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          appearance?: Json
          created_at?: string
          display_name?: string
          household_id?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          appearance?: Json
          created_at?: string
          display_name?: string
          household_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_totals: {
        Row: {
          carbs: number | null
          carbs_missing: boolean | null
          date: string | null
          fat: number | null
          fat_missing: boolean | null
          fiber: number | null
          fiber_missing: boolean | null
          kcal: number | null
          meal_count: number | null
          protein: number | null
          protein_missing: boolean | null
          salt: number | null
          salt_missing: boolean | null
          sat_fat: number | null
          sat_fat_missing: boolean | null
          sugar: number | null
          sugar_missing: boolean | null
          user_id: string | null
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
      meal_totals: {
        Row: {
          carbs: number | null
          carbs_missing: boolean | null
          date: string | null
          fat: number | null
          fat_missing: boolean | null
          fiber: number | null
          fiber_missing: boolean | null
          item_count: number | null
          kcal: number | null
          meal_id: string | null
          meal_type: Database["public"]["Enums"]["meal_type"] | null
          protein: number | null
          protein_missing: boolean | null
          salt: number | null
          salt_missing: boolean | null
          sat_fat: number | null
          sat_fat_missing: boolean | null
          sugar: number | null
          sugar_missing: boolean | null
          user_id: string | null
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
    }
    Functions: {
      create_household: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_meal: {
        Args: {
          p_date: string
          p_meal_type: Database["public"]["Enums"]["meal_type"]
          p_user_id: string
        }
        Returns: string
      }
      join_household: {
        Args: { p_invite_code: string }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      amount_unit: "g" | "unit"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      nutrition_basis: "per_100g" | "per_unit"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      amount_unit: ["g", "unit"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      nutrition_basis: ["per_100g", "per_unit"],
    },
  },
} as const
