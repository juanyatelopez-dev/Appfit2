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
      body_measurements: {
        Row: {
          arm_cm: number | null
          body_fat_pct: number | null
          created_at: string
          date_key: string
          fat_mass_kg: number | null
          hip_cm: number | null
          id: string
          lean_mass_kg: number | null
          neck_cm: number
          notes: string | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number
        }
        Insert: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          created_at?: string
          date_key: string
          fat_mass_kg?: number | null
          hip_cm?: number | null
          id?: string
          lean_mass_kg?: number | null
          neck_cm: number
          notes?: string | null
          thigh_cm?: number | null
          user_id: string
          waist_cm: number
        }
        Update: {
          arm_cm?: number | null
          body_fat_pct?: number | null
          created_at?: string
          date_key?: string
          fat_mass_kg?: number | null
          hip_cm?: number | null
          id?: string
          lean_mass_kg?: number | null
          neck_cm?: number
          notes?: string | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          created_at: string | null
          id: string
          measured_at: string
          notes: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          measured_at?: string
          notes?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string | null
          id?: string
          measured_at?: string
          notes?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      daily_nutrition_logs: {
        Row: {
          archetype_snapshot: string | null
          base_tdee: number | null
          calorie_adjustment: number | null
          calorie_override: number | null
          created_at: string
          date_key: string
          id: string
          nutrition_profile_id: string | null
          profile_name_snapshot: string | null
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          updated_at: string
          user_id: string
          weight_snapshot_kg: number | null
        }
        Insert: {
          archetype_snapshot?: string | null
          base_tdee?: number | null
          calorie_adjustment?: number | null
          calorie_override?: number | null
          created_at?: string
          date_key: string
          id?: string
          nutrition_profile_id?: string | null
          profile_name_snapshot?: string | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          updated_at?: string
          user_id: string
          weight_snapshot_kg?: number | null
        }
        Update: {
          archetype_snapshot?: string | null
          base_tdee?: number | null
          calorie_adjustment?: number | null
          calorie_override?: number | null
          created_at?: string
          date_key?: string
          id?: string
          nutrition_profile_id?: string | null
          profile_name_snapshot?: string | null
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          updated_at?: string
          user_id?: string
          weight_snapshot_kg?: number | null
        }
        Relationships: []
      }
      daily_nutrition_summaries: {
        Row: {
          created_at: string
          date_key: string
          id: string
          meal_count: number
          nutrient_density_score: number | null
          sodium_potassium_ratio: number | null
          total_calories: number
          total_carbs_g: number
          total_fat_g: number
          total_fiber_g: number
          total_potassium_mg: number
          total_protein_g: number
          total_sodium_mg: number
          total_sugar_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_key: string
          id?: string
          meal_count?: number
          nutrient_density_score?: number | null
          sodium_potassium_ratio?: number | null
          total_calories?: number
          total_carbs_g?: number
          total_fat_g?: number
          total_fiber_g?: number
          total_potassium_mg?: number
          total_protein_g?: number
          total_sodium_mg?: number
          total_sugar_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_key?: string
          id?: string
          meal_count?: number
          nutrient_density_score?: number | null
          sodium_potassium_ratio?: number | null
          total_calories?: number
          total_carbs_g?: number
          total_fat_g?: number
          total_fiber_g?: number
          total_potassium_mg?: number
          total_protein_g?: number
          total_sodium_mg?: number
          total_sugar_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_nutrition_targets: {
        Row: {
          activity_multiplier: number
          archetype_delta: number
          bmr: number
          calorie_override: number | null
          calorie_target: number
          carb_calories: number
          carb_grams: number
          created_at: string
          date_key: string
          day_archetype: string
          fat_calories: number
          fat_grams: number
          final_target_calories: number
          goal_multiplier: number
          id: string
          is_manual_override: boolean
          protein_calories: number
          protein_grams: number
          tdee: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_multiplier: number
          archetype_delta: number
          bmr: number
          calorie_override?: number | null
          calorie_target: number
          carb_calories: number
          carb_grams: number
          created_at?: string
          date_key: string
          day_archetype?: string
          fat_calories: number
          fat_grams: number
          final_target_calories: number
          goal_multiplier: number
          id?: string
          is_manual_override?: boolean
          protein_calories: number
          protein_grams: number
          tdee: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_multiplier?: number
          archetype_delta?: number
          bmr?: number
          calorie_override?: number | null
          calorie_target?: number
          carb_calories?: number
          carb_grams?: number
          created_at?: string
          date_key?: string
          day_archetype?: string
          fat_calories?: number
          fat_grams?: number
          final_target_calories?: number
          goal_multiplier?: number
          id?: string
          is_manual_override?: boolean
          protein_calories?: number
          protein_grams?: number
          tdee?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_database: {
        Row: {
          calories: number
          carbs_g: number
          category: string
          created_at: string
          fat_g: number
          fiber_g: number | null
          food_name: string
          id: string
          micronutrients: Json | null
          potassium_mg: number | null
          protein_g: number
          serving_size: number
          serving_unit: string
          sodium_mg: number | null
          source: string | null
          sugar_g: number | null
        }
        Insert: {
          calories?: number
          carbs_g?: number
          category: string
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_name: string
          id?: string
          micronutrients?: Json | null
          potassium_mg?: number | null
          protein_g?: number
          serving_size?: number
          serving_unit?: string
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
        }
        Update: {
          calories?: number
          carbs_g?: number
          category?: string
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          food_name?: string
          id?: string
          micronutrients?: Json | null
          potassium_mg?: number | null
          protein_g?: number
          serving_size?: number
          serving_unit?: string
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
        }
        Relationships: []
      }
      nutrition_entries: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          daily_log_id: string | null
          date_key: string
          fat_g: number
          fiber_g: number | null
          food_name: string
          id: string
          meal_type: string
          micronutrients: Json | null
          notes: string | null
          nutrient_density_score: number | null
          potassium_mg: number | null
          protein_g: number
          serving_size: number
          serving_unit: string
          sodium_mg: number | null
          sugar_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          daily_log_id?: string | null
          date_key: string
          fat_g?: number
          fiber_g?: number | null
          food_name: string
          id?: string
          meal_type: string
          micronutrients?: Json | null
          notes?: string | null
          nutrient_density_score?: number | null
          potassium_mg?: number | null
          protein_g?: number
          serving_size: number
          serving_unit: string
          sodium_mg?: number | null
          sugar_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          daily_log_id?: string | null
          date_key?: string
          fat_g?: number
          fiber_g?: number | null
          food_name?: string
          id?: string
          meal_type?: string
          micronutrients?: Json | null
          notes?: string | null
          nutrient_density_score?: number | null
          potassium_mg?: number | null
          protein_g?: number
          serving_size?: number
          serving_unit?: string
          sodium_mg?: number | null
          sugar_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_favorites: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          fiber_g: number | null
          id: string
          micronutrients: Json | null
          name: string
          nutrient_density_score: number | null
          potassium_mg: number | null
          protein_g: number
          serving_size: number
          serving_unit: string
          sodium_mg: number | null
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          id?: string
          micronutrients?: Json | null
          name: string
          nutrient_density_score?: number | null
          potassium_mg?: number | null
          protein_g?: number
          serving_size: number
          serving_unit: string
          sodium_mg?: number | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          fiber_g?: number | null
          id?: string
          micronutrients?: Json | null
          name?: string
          nutrient_density_score?: number | null
          potassium_mg?: number | null
          protein_g?: number
          serving_size?: number
          serving_unit?: string
          sodium_mg?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_profiles: {
        Row: {
          archetype: string
          created_at: string
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archetype: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archetype?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_prs: {
        Row: {
          achieved_at: string
          created_at: string
          exercise_id: string
          id: string
          metadata: Json | null
          pr_type: string
          session_id: string | null
          set_id: string | null
          updated_at: string
          user_id: string
          value_num: number
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          exercise_id: string
          id?: string
          metadata?: Json | null
          pr_type: string
          session_id?: string | null
          set_id?: string | null
          updated_at?: string
          user_id: string
          value_num: number
        }
        Update: {
          achieved_at?: string
          created_at?: string
          exercise_id?: string
          id?: string
          metadata?: Json | null
          pr_type?: string
          session_id?: string | null
          set_id?: string | null
          updated_at?: string
          user_id?: string
          value_num?: number
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          completed: boolean
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          reps: number
          rir: number | null
          session_id: string
          set_number: number
          weight: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          reps?: number
          rir?: number | null
          session_id: string
          set_number: number
          weight?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          reps?: number
          rir?: number | null
          session_id?: string
          set_number?: number
          weight?: number
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          equipment: string
          id: string
          instructions: string | null
          is_custom: boolean
          movement_type: string
          muscle_group: string
          name: string
          secondary_muscles: string[]
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty: string
          equipment: string
          id?: string
          instructions?: string | null
          is_custom?: boolean
          movement_type: string
          muscle_group: string
          name: string
          secondary_muscles?: string[]
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          equipment?: string
          id?: string
          instructions?: string | null
          is_custom?: boolean
          movement_type?: string
          muscle_group?: string
          name?: string
          secondary_muscles?: string[]
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          biological_sex: string | null
          birth_date: string | null
          calorie_goal: number | null
          carb_goal_g: number | null
          dashboard_task_metrics: string[] | null
          day_archetype: string | null
          fat_goal_g: number | null
          full_name: string | null
          goal_direction: string | null
          goal_type: string | null
          height: number | null
          id: string
          nutrition_goal_type: string | null
          protein_goal_g: number | null
          target_weight_kg: number | null
          timezone: string | null
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          biological_sex?: string | null
          birth_date?: string | null
          calorie_goal?: number | null
          carb_goal_g?: number | null
          dashboard_task_metrics?: string[] | null
          day_archetype?: string | null
          fat_goal_g?: number | null
          full_name?: string | null
          goal_direction?: string | null
          goal_type?: string | null
          height?: number | null
          id: string
          nutrition_goal_type?: string | null
          protein_goal_g?: number | null
          target_weight_kg?: number | null
          timezone?: string | null
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          biological_sex?: string | null
          birth_date?: string | null
          calorie_goal?: number | null
          carb_goal_g?: number | null
          dashboard_task_metrics?: string[] | null
          day_archetype?: string | null
          fat_goal_g?: number | null
          full_name?: string | null
          goal_direction?: string | null
          goal_type?: string | null
          height?: number | null
          id?: string
          nutrition_goal_type?: string | null
          protein_goal_g?: number | null
          target_weight_kg?: number | null
          timezone?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      session_exercise_notes: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_role: string
          created_at: string | null
          id: string
          onboarding_completed: boolean | null
        }
        Insert: {
          account_role?: string
          created_at?: string | null
          id: string
          onboarding_completed?: boolean | null
        }
        Update: {
          account_role?: string
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          rest_seconds: number
          target_reps: string
          target_sets: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          rest_seconds?: number
          target_reps?: string
          target_sets?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          rest_seconds?: number
          target_reps?: string
          target_sets?: number
          workout_id?: string
        }
        Relationships: []
      }
      workout_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          updated_at: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          updated_at?: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          updated_at?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string
          status: string
          total_volume: number
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          total_volume?: number
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          total_volume?: number
          user_id?: string
          workout_id?: string
        }
        Relationships: []
      }
      workout_template_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          rest_seconds: number
          target_reps: string
          target_sets: number
          template_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          rest_seconds?: number
          target_reps?: string
          target_sets?: number
          template_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          rest_seconds?: number
          target_reps?: string
          target_sets?: number
          template_id?: string
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          created_at: string
          description: string | null
          focus_tags: string[]
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          focus_tags?: string[]
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          focus_tags?: string[]
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_account_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_admin_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          admin_users: number
          body_measurements_entries: number
          body_metrics_entries: number
          completed_onboarding_users: number
          nutrition_entries: number
          nutrition_profiles: number
          onboarding_inconsistent: number
          total_users: number
          users_without_activity: number
          users_without_profile: number
        }[]
      }
      get_admin_role_change_audit: {
        Args: Record<PropertyKey, never>
        Returns: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string | null
          id: string
          next_role: string
          previous_role: string
          target_email: string | null
          target_user_id: string
        }[]
      }
      get_admin_user_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_role: string
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          onboarding_completed: boolean | null
          user_id: string
        }[]
      }
      set_user_account_role: {
        Args: {
          next_role: string
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
