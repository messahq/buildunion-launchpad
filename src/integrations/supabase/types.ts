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
      admin_email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_preview: string | null
          recipient_email: string
          recipient_name: string | null
          sender_id: string
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_preview?: string | null
          recipient_email: string
          recipient_name?: string | null
          sender_id: string
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_preview?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sender_id?: string
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      ai_model_usage: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          latency_ms: number | null
          model_used: string
          success: boolean | null
          tier: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          model_used: string
          success?: boolean | null
          tier?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          model_used?: string
          success?: boolean | null
          tier?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_key_requests: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          key_type: string
          user_agent: string | null
          user_identifier: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          key_type?: string
          user_agent?: string | null
          user_identifier: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          key_type?: string
          user_agent?: string | null
          user_identifier?: string
        }
        Relationships: []
      }
      baseline_versions: {
        Row: {
          change_reason: string
          changed_at: string
          changed_by: string
          created_at: string
          id: string
          previous_version_id: string | null
          project_id: string
          snapshot: Json
          summary_id: string
          version_number: number
        }
        Insert: {
          change_reason: string
          changed_at?: string
          changed_by: string
          created_at?: string
          id?: string
          previous_version_id?: string | null
          project_id: string
          snapshot: Json
          summary_id: string
          version_number?: number
        }
        Update: {
          change_reason?: string
          changed_at?: string
          changed_by?: string
          created_at?: string
          id?: string
          previous_version_id?: string | null
          project_id?: string
          snapshot?: Json
          summary_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "baseline_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "baseline_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_baseline_versions_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_baseline_versions_summary"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_baseline_versions_summary"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "project_summaries_team"
            referencedColumns: ["id"]
          },
        ]
      }
      bu_profiles: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          company_logo_url: string | null
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
          is_public_profile: boolean | null
          is_union_member: boolean | null
          is_verified: boolean | null
          latitude: number | null
          location_status: string | null
          location_updated_at: string | null
          longitude: number | null
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
          company_logo_url?: string | null
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
          is_public_profile?: boolean | null
          is_union_member?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          location_status?: string | null
          location_updated_at?: string | null
          longitude?: number | null
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
          company_logo_url?: string | null
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
          is_public_profile?: boolean | null
          is_union_member?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          location_status?: string | null
          location_updated_at?: string | null
          longitude?: number | null
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
      contract_events: {
        Row: {
          contract_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          additional_terms: string | null
          archived_at: string | null
          cancellation_policy: string | null
          change_order_policy: string | null
          client_address: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          client_signature: Json | null
          client_signed_at: string | null
          client_viewed_at: string | null
          contract_date: string
          contract_number: string
          contractor_address: string | null
          contractor_email: string | null
          contractor_license: string | null
          contractor_name: string | null
          contractor_phone: string | null
          contractor_signature: Json | null
          created_at: string
          deposit_amount: number | null
          deposit_percentage: number | null
          dispute_resolution: string | null
          estimated_end_date: string | null
          has_liability_insurance: boolean | null
          has_wsib: boolean | null
          id: string
          materials_included: boolean | null
          payment_schedule: string | null
          project_address: string | null
          project_id: string | null
          project_name: string | null
          scope_of_work: string | null
          sent_to_client_at: string | null
          share_token: string | null
          share_token_expires_at: string | null
          start_date: string | null
          status: string
          template_type: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
          warranty_period: string | null
          working_days: string | null
        }
        Insert: {
          additional_terms?: string | null
          archived_at?: string | null
          cancellation_policy?: string | null
          change_order_policy?: string | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_signature?: Json | null
          client_signed_at?: string | null
          client_viewed_at?: string | null
          contract_date?: string
          contract_number: string
          contractor_address?: string | null
          contractor_email?: string | null
          contractor_license?: string | null
          contractor_name?: string | null
          contractor_phone?: string | null
          contractor_signature?: Json | null
          created_at?: string
          deposit_amount?: number | null
          deposit_percentage?: number | null
          dispute_resolution?: string | null
          estimated_end_date?: string | null
          has_liability_insurance?: boolean | null
          has_wsib?: boolean | null
          id?: string
          materials_included?: boolean | null
          payment_schedule?: string | null
          project_address?: string | null
          project_id?: string | null
          project_name?: string | null
          scope_of_work?: string | null
          sent_to_client_at?: string | null
          share_token?: string | null
          share_token_expires_at?: string | null
          start_date?: string | null
          status?: string
          template_type?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
          warranty_period?: string | null
          working_days?: string | null
        }
        Update: {
          additional_terms?: string | null
          archived_at?: string | null
          cancellation_policy?: string | null
          change_order_policy?: string | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_signature?: Json | null
          client_signed_at?: string | null
          client_viewed_at?: string | null
          contract_date?: string
          contract_number?: string
          contractor_address?: string | null
          contractor_email?: string | null
          contractor_license?: string | null
          contractor_name?: string | null
          contractor_phone?: string | null
          contractor_signature?: Json | null
          created_at?: string
          deposit_amount?: number | null
          deposit_percentage?: number | null
          dispute_resolution?: string | null
          estimated_end_date?: string | null
          has_liability_insurance?: boolean | null
          has_wsib?: boolean | null
          id?: string
          materials_included?: boolean | null
          payment_schedule?: string | null
          project_address?: string | null
          project_id?: string | null
          project_name?: string | null
          scope_of_work?: string | null
          sent_to_client_at?: string | null
          share_token?: string | null
          share_token_expires_at?: string | null
          start_date?: string | null
          status?: string
          template_type?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
          warranty_period?: string | null
          working_days?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          replies_count: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          replies_count?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          replies_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      material_deliveries: {
        Row: {
          created_at: string
          delivered_quantity: number
          expected_quantity: number
          id: string
          logged_at: string
          logged_by: string
          material_name: string
          notes: string | null
          photo_url: string | null
          project_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_quantity?: number
          expected_quantity?: number
          id?: string
          logged_at?: string
          logged_by: string
          material_name: string
          notes?: string | null
          photo_url?: string | null
          project_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_quantity?: number
          expected_quantity?: number
          id?: string
          logged_at?: string
          logged_by?: string
          material_name?: string
          notes?: string | null
          photo_url?: string | null
          project_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      obc_chunks: {
        Row: {
          char_count: number | null
          chunk_index: number
          chunk_text: string
          created_at: string | null
          id: string
          section_id: string | null
          token_estimate: number | null
        }
        Insert: {
          char_count?: number | null
          chunk_index: number
          chunk_text: string
          created_at?: string | null
          id?: string
          section_id?: string | null
          token_estimate?: number | null
        }
        Update: {
          char_count?: number | null
          chunk_index?: number
          chunk_text?: string
          created_at?: string | null
          id?: string
          section_id?: string | null
          token_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obc_chunks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "obc_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      obc_embeddings: {
        Row: {
          chunk_id: string
          created_at: string | null
          embedding: string | null
          embedding_model: string | null
          id: string
        }
        Insert: {
          chunk_id: string
          created_at?: string | null
          embedding?: string | null
          embedding_model?: string | null
          id?: string
        }
        Update: {
          chunk_id?: string
          created_at?: string | null
          embedding?: string | null
          embedding_model?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obc_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "obc_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      obc_sections: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          part_number: number
          section_number: string
          section_title: string
          subsection_number: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          part_number: number
          section_number: string
          section_title: string
          subsection_number?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          part_number?: number
          section_number?: string
          section_title?: string
          subsection_number?: string | null
        }
        Relationships: []
      }
      pending_budget_changes: {
        Row: {
          change_reason: string | null
          created_at: string
          id: string
          item_id: string
          item_name: string
          item_type: string
          new_quantity: number | null
          new_total: number | null
          new_unit_price: number | null
          original_quantity: number | null
          original_total: number | null
          original_unit_price: number | null
          project_id: string
          requested_at: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary_id: string | null
          updated_at: string
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_name: string
          item_type?: string
          new_quantity?: number | null
          new_total?: number | null
          new_unit_price?: number | null
          original_quantity?: number | null
          original_total?: number | null
          original_unit_price?: number | null
          project_id: string
          requested_at?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary_id?: string | null
          updated_at?: string
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          new_quantity?: number | null
          new_total?: number | null
          new_unit_price?: number | null
          original_quantity?: number | null
          original_total?: number | null
          original_unit_price?: number | null
          project_id?: string
          requested_at?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_budget_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_budget_changes_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "project_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_budget_changes_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "project_summaries_team"
            referencedColumns: ["id"]
          },
        ]
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
      project_chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          project_id: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          project_id: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          ai_workflow_config: Json | null
          baseline_locked_at: string | null
          baseline_locked_by: string | null
          baseline_snapshot: Json | null
          blueprint_analysis: Json | null
          calculator_results: Json | null
          client_address: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          current_baseline_version_id: string | null
          id: string
          invoice_id: string | null
          invoice_sent_at: string | null
          invoice_status: string | null
          labor_cost: number | null
          line_items: Json | null
          material_cost: number | null
          mode: string
          notes: string | null
          photo_estimate: Json | null
          project_end_date: string | null
          project_id: string | null
          project_start_date: string | null
          quantity_logic_version: number | null
          status: string
          template_items: Json | null
          total_cost: number | null
          updated_at: string
          user_id: string
          verified_facts: Json | null
        }
        Insert: {
          ai_workflow_config?: Json | null
          baseline_locked_at?: string | null
          baseline_locked_by?: string | null
          baseline_snapshot?: Json | null
          blueprint_analysis?: Json | null
          calculator_results?: Json | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          current_baseline_version_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_sent_at?: string | null
          invoice_status?: string | null
          labor_cost?: number | null
          line_items?: Json | null
          material_cost?: number | null
          mode?: string
          notes?: string | null
          photo_estimate?: Json | null
          project_end_date?: string | null
          project_id?: string | null
          project_start_date?: string | null
          quantity_logic_version?: number | null
          status?: string
          template_items?: Json | null
          total_cost?: number | null
          updated_at?: string
          user_id: string
          verified_facts?: Json | null
        }
        Update: {
          ai_workflow_config?: Json | null
          baseline_locked_at?: string | null
          baseline_locked_by?: string | null
          baseline_snapshot?: Json | null
          blueprint_analysis?: Json | null
          calculator_results?: Json | null
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          current_baseline_version_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_sent_at?: string | null
          invoice_status?: string | null
          labor_cost?: number | null
          line_items?: Json | null
          material_cost?: number | null
          mode?: string
          notes?: string | null
          photo_estimate?: Json | null
          project_end_date?: string | null
          project_id?: string | null
          project_start_date?: string | null
          quantity_logic_version?: number | null
          status?: string
          template_items?: Json | null
          total_cost?: number | null
          updated_at?: string
          user_id?: string
          verified_facts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_summaries_current_baseline_version_id_fkey"
            columns: ["current_baseline_version_id"]
            isOneToOne: false
            referencedRelation: "baseline_versions"
            referencedColumns: ["id"]
          },
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
      project_tasks: {
        Row: {
          archived_at: string | null
          assigned_by: string
          assigned_to: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          quantity: number | null
          status: string
          title: string
          total_cost: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_by: string
          assigned_to: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          quantity?: number | null
          status?: string
          title: string
          total_cost?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_by?: string
          assigned_to?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          quantity?: number | null
          status?: string
          title?: string
          total_cost?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
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
          archived_at: string | null
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
          archived_at?: string | null
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
          archived_at?: string | null
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
      site_logs: {
        Row: {
          completed_count: number | null
          created_at: string
          id: string
          notes: string | null
          pdf_url: string | null
          photos_count: number | null
          report_name: string
          tasks_data: Json | null
          template_type: string
          total_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          pdf_url?: string | null
          photos_count?: number | null
          report_name: string
          tasks_data?: Json | null
          template_type: string
          total_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          pdf_url?: string | null
          photos_count?: number | null
          report_name?: string
          tasks_data?: Json | null
          template_type?: string
          total_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          name: string
          tasks: Json
          updated_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          tasks?: Json
          updated_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          tasks?: Json
          updated_at?: string
          use_count?: number | null
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
          role: string | null
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
          role?: string | null
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
          role?: string | null
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
      team_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      trade_obc_mapping: {
        Row: {
          created_at: string | null
          id: string
          obc_section_id: string
          relevance_score: number | null
          required: boolean | null
          trade_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          obc_section_id: string
          relevance_score?: number | null
          required?: boolean | null
          trade_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          obc_section_id?: string
          relevance_score?: number | null
          required?: boolean | null
          trade_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_obc_mapping_obc_section_id_fkey"
            columns: ["obc_section_id"]
            isOneToOne: false
            referencedRelation: "obc_sections"
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
      bu_profiles_collaborator: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          company_logo_url: string | null
          company_name: string | null
          company_website: string | null
          created_at: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years: number | null
          hourly_rate: number | null
          id: string | null
          is_contractor: boolean | null
          is_public_profile: boolean | null
          is_union_member: boolean | null
          is_verified: boolean | null
          latitude: number | null
          location_status: string | null
          location_updated_at: string | null
          longitude: number | null
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
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          company_logo_url?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string | null
          is_contractor?: boolean | null
          is_public_profile?: boolean | null
          is_union_member?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          location_status?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: never
          primary_trade?:
            | Database["public"]["Enums"]["construction_trade"]
            | null
          profile_completed?: boolean | null
          secondary_trades?:
            | Database["public"]["Enums"]["construction_trade"][]
            | null
          service_area?: string | null
          union_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          company_logo_url?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string | null
          is_contractor?: boolean | null
          is_public_profile?: boolean | null
          is_union_member?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          location_status?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: never
          primary_trade?:
            | Database["public"]["Enums"]["construction_trade"]
            | null
          profile_completed?: boolean | null
          secondary_trades?:
            | Database["public"]["Enums"]["construction_trade"][]
            | null
          service_area?: string | null
          union_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bu_profiles_public: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          company_name: string | null
          created_at: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years: number | null
          id: string | null
          is_contractor: boolean | null
          is_verified: boolean | null
          primary_trade:
            | Database["public"]["Enums"]["construction_trade"]
            | null
          secondary_trades:
            | Database["public"]["Enums"]["construction_trade"][]
            | null
          service_area: string | null
          user_id: string | null
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          company_name?: string | null
          created_at?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years?: number | null
          id?: string | null
          is_contractor?: boolean | null
          is_verified?: boolean | null
          primary_trade?:
            | Database["public"]["Enums"]["construction_trade"]
            | null
          secondary_trades?:
            | Database["public"]["Enums"]["construction_trade"][]
            | null
          service_area?: string | null
          user_id?: string | null
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          company_name?: string | null
          created_at?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_years?: number | null
          id?: string | null
          is_contractor?: boolean | null
          is_verified?: boolean | null
          primary_trade?:
            | Database["public"]["Enums"]["construction_trade"]
            | null
          secondary_trades?:
            | Database["public"]["Enums"]["construction_trade"][]
            | null
          service_area?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      project_summaries_team: {
        Row: {
          ai_workflow_config: Json | null
          baseline_locked_at: string | null
          baseline_locked_by: string | null
          baseline_snapshot: Json | null
          blueprint_analysis: Json | null
          calculator_results: Json | null
          created_at: string | null
          current_baseline_version_id: string | null
          id: string | null
          invoice_id: string | null
          invoice_sent_at: string | null
          invoice_status: string | null
          labor_cost: number | null
          line_items: Json | null
          material_cost: number | null
          mode: string | null
          notes: string | null
          photo_estimate: Json | null
          project_end_date: string | null
          project_id: string | null
          project_start_date: string | null
          status: string | null
          template_items: Json | null
          total_cost: number | null
          updated_at: string | null
          user_id: string | null
          verified_facts: Json | null
        }
        Insert: {
          ai_workflow_config?: Json | null
          baseline_locked_at?: string | null
          baseline_locked_by?: string | null
          baseline_snapshot?: Json | null
          blueprint_analysis?: Json | null
          calculator_results?: Json | null
          created_at?: string | null
          current_baseline_version_id?: string | null
          id?: string | null
          invoice_id?: string | null
          invoice_sent_at?: string | null
          invoice_status?: string | null
          labor_cost?: number | null
          line_items?: Json | null
          material_cost?: number | null
          mode?: string | null
          notes?: string | null
          photo_estimate?: Json | null
          project_end_date?: string | null
          project_id?: string | null
          project_start_date?: string | null
          status?: string | null
          template_items?: Json | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string | null
          verified_facts?: Json | null
        }
        Update: {
          ai_workflow_config?: Json | null
          baseline_locked_at?: string | null
          baseline_locked_by?: string | null
          baseline_snapshot?: Json | null
          blueprint_analysis?: Json | null
          calculator_results?: Json | null
          created_at?: string | null
          current_baseline_version_id?: string | null
          id?: string | null
          invoice_id?: string | null
          invoice_sent_at?: string | null
          invoice_status?: string | null
          labor_cost?: number | null
          line_items?: Json | null
          material_cost?: number | null
          mode?: string | null
          notes?: string | null
          photo_estimate?: Json | null
          project_end_date?: string | null
          project_id?: string | null
          project_start_date?: string | null
          status?: string | null
          template_items?: Json | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string | null
          verified_facts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_summaries_current_baseline_version_id_fkey"
            columns: ["current_baseline_version_id"]
            isOneToOne: false
            referencedRelation: "baseline_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_project_member_validated: {
        Args: { _project_id: string; _role: string; _user_id: string }
        Returns: Json
      }
      can_manage_tasks: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_update_task_status: {
        Args: { _project_id: string; _task_id: string; _user_id: string }
        Returns: boolean
      }
      can_upload_documents: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_all_project_data: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_phone: {
        Args: { _profile_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      get_collaborator_profiles: {
        Args: { _viewer_id: string }
        Returns: {
          availability: string
          avatar_url: string
          bio: string
          certifications: string[]
          company_logo_url: string
          company_name: string
          company_website: string
          created_at: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          experience_years: number
          hourly_rate: number
          id: string
          is_contractor: boolean
          is_public_profile: boolean
          is_union_member: boolean
          is_verified: boolean
          latitude: number
          location_status: string
          location_updated_at: string
          longitude: number
          phone: string
          primary_trade: Database["public"]["Enums"]["construction_trade"]
          profile_completed: boolean
          secondary_trades: Database["public"]["Enums"]["construction_trade"][]
          service_area: string
          union_name: string
          updated_at: string
          user_id: string
        }[]
      }
      get_project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: string
      }
      get_public_profiles: {
        Args: {
          availability_filter?: string
          contractors_only?: boolean
          result_limit?: number
          search_query?: string
          trade_filter?: string
        }
        Returns: {
          availability: string
          avatar_url: string
          bio: string
          certifications: string[]
          company_name: string
          created_at: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          experience_years: number
          id: string
          is_contractor: boolean
          is_verified: boolean
          primary_trade: Database["public"]["Enums"]["construction_trade"]
          secondary_trades: Database["public"]["Enums"]["construction_trade"][]
          service_area: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_share_token_valid: { Args: { _contract_id: string }; Returns: boolean }
      match_obc_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_text: string
          section_number: string
          section_title: string
          similarity: number
        }[]
      }
      search_bu_users_for_team: {
        Args: { _limit?: number; _project_id: string; _search_query: string }
        Returns: {
          avatar_url: string
          company_name: string
          full_name: string
          id: string
          is_verified: boolean
          primary_trade: Database["public"]["Enums"]["construction_trade"]
          profile_completed: boolean
          user_id: string
        }[]
      }
      users_share_project: {
        Args: { _profile_owner_id: string; _viewer_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      project_role:
        | "owner"
        | "foreman"
        | "worker"
        | "inspector"
        | "subcontractor"
        | "member"
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
      app_role: ["admin", "moderator", "user"],
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
      project_role: [
        "owner",
        "foreman",
        "worker",
        "inspector",
        "subcontractor",
        "member",
      ],
    },
  },
} as const
