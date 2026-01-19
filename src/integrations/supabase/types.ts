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
      bu_profiles: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          company_name: string | null
          company_website: string | null
          created_at: string
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_contractor: boolean | null
          is_union_member: boolean | null
          is_verified: boolean | null
          phone: string | null
          primary_trade:
            | Database["public"]["Enums"]["construction_trade"]
            | null
          profile_completed: boolean | null
          secondary_trades:
            | Database["public"]["Enums"]["construction_trade"][]
            | null
          service_area: string | null
          union_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_contractor?: boolean | null
          is_union_member?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          primary_trade?:
            | Database["public"]["Enums"]["construction_trade"]
            | null
          profile_completed?: boolean | null
          secondary_trades?:
            | Database["public"]["Enums"]["construction_trade"][]
            | null
          service_area?: string | null
          union_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_contractor?: boolean | null
          is_union_member?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          primary_trade?:
            | Database["public"]["Enums"]["construction_trade"]
            | null
          profile_completed?: boolean | null
          secondary_trades?:
            | Database["public"]["Enums"]["construction_trade"][]
            | null
          service_area?: string | null
          union_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string | null
          data: Json | null
          id: string
          sent_at: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          data?: Json | null
          id?: string
          sent_at?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          data?: Json | null
          id?: string
          sent_at?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          project_id: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          project_id: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          project_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_summaries: {
        Row: {
          blueprint_analysis: Json | null
          calculator_results: Json | null
          client_address: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          id: string
          invoice_id: string | null
          invoice_sent_at: string | null
          invoice_status: string | null
          labor_cost: number | null
          line_items: Json | null
          material_cost: number | null
          notes: string | null
          photo_estimate: Json | null
          project_id: string | null
          status: string
          template_items: Json | null
          total_cost: number | null
          updated_at: string
          user_id: string
          verified_facts: Json | null
        }
        Insert: {
          blueprint_analysis?: Json | null
          calculator_results?: Json | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          invoice_sent_at?: string | null
          invoice_status?: string | null
          labor_cost?: number | null
          line_items?: Json | null
          material_cost?: number | null
          notes?: string | null
          photo_estimate?: Json | null
          project_id?: string | null
          status?: string
          template_items?: Json | null
          total_cost?: number | null
          updated_at?: string
          user_id: string
          verified_facts?: Json | null
        }
        Update: {
          blueprint_analysis?: Json | null
          calculator_results?: Json | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          invoice_sent_at?: string | null
          invoice_status?: string | null
          labor_cost?: number | null
          line_items?: Json | null
          material_cost?: number | null
          notes?: string | null
          photo_estimate?: Json | null
          project_id?: string | null
          status?: string
          template_items?: Json | null
          total_cost?: number | null
          updated_at?: string
          user_id?: string
          verified_facts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_syntheses: {
        Row: {
          answer: string
          created_at: string
          gemini_response: string | null
          id: string
          openai_response: string | null
          project_id: string
          question: string
          sources: Json | null
          user_id: string
          verification_status: string
        }
        Insert: {
          answer: string
          created_at?: string
          gemini_response?: string | null
          id?: string
          openai_response?: string | null
          project_id: string
          question: string
          sources?: Json | null
          user_id: string
          verification_status?: string
        }
        Update: {
          answer?: string
          created_at?: string
          gemini_response?: string | null
          id?: string
          openai_response?: string | null
          project_id?: string
          question?: string
          sources?: Json | null
          user_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_syntheses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          id: string
          manpower_requirements: Json | null
          name: string
          required_certifications: string[] | null
          site_images: string[] | null
          status: string
          trade: string | null
          trades: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manpower_requirements?: Json | null
          name: string
          required_certifications?: string[] | null
          site_images?: string[] | null
          status?: string
          trade?: string | null
          trades?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manpower_requirements?: Json | null
          name?: string
          required_certifications?: string[] | null
          site_images?: string[] | null
          status?: string
          trade?: string | null
          trades?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invitation_token: string | null
          invited_by: string
          project_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invitation_token?: string | null
          invited_by: string
          project_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invitation_token?: string | null
          invited_by?: string
          project_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_draft_data: {
        Row: {
          created_at: string
          data: Json
          draft_type: string
          id: string
          last_updated: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          draft_type?: string
          id?: string
          last_updated?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          draft_type?: string
          id?: string
          last_updated?: string
          user_id?: string
        }
        Relationships: []
      }
      user_templates: {
        Row: {
          area_unit: string | null
          calculator_type: string | null
          category: string | null
          checklist: Json | null
          created_at: string
          description: string | null
          estimated_area: number | null
          icon: string | null
          id: string
          is_public: boolean | null
          line_items: Json | null
          materials: Json | null
          name: string
          updated_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          area_unit?: string | null
          calculator_type?: string | null
          category?: string | null
          checklist?: Json | null
          created_at?: string
          description?: string | null
          estimated_area?: number | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          line_items?: Json | null
          materials?: Json | null
          name: string
          updated_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          area_unit?: string | null
          calculator_type?: string | null
          category?: string | null
          checklist?: Json | null
          created_at?: string
          description?: string | null
          estimated_area?: number | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          line_items?: Json | null
          materials?: Json | null
          name?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_trials: {
        Row: {
          created_at: string
          feature: string
          id: string
          last_used: string | null
          max_allowed: number
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature?: string
          id?: string
          last_used?: string | null
          max_allowed?: number
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          last_used?: string | null
          max_allowed?: number
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      construction_trade:
        | "general_contractor"
        | "electrician"
        | "plumber"
        | "carpenter"
        | "mason"
        | "roofer"
        | "hvac_technician"
        | "painter"
        | "welder"
        | "heavy_equipment_operator"
        | "concrete_worker"
        | "drywall_installer"
        | "flooring_specialist"
        | "landscaper"
        | "project_manager"
        | "architect"
        | "engineer"
        | "inspector"
        | "other"
      experience_level:
        | "apprentice"
        | "journeyman"
        | "master"
        | "supervisor"
        | "manager"
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
      construction_trade: [
        "general_contractor",
        "electrician",
        "plumber",
        "carpenter",
        "mason",
        "roofer",
        "hvac_technician",
        "painter",
        "welder",
        "heavy_equipment_operator",
        "concrete_worker",
        "drywall_installer",
        "flooring_specialist",
        "landscaper",
        "project_manager",
        "architect",
        "engineer",
        "inspector",
        "other",
      ],
      experience_level: [
        "apprentice",
        "journeyman",
        "master",
        "supervisor",
        "manager",
      ],
    },
  },
} as const
