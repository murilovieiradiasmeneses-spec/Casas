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
      crm_leads: {
        Row: {
          id: string
          agency_id: string
          property_id: string | null
          assigned_agent_id: string | null
          consent_at: string | null
          birth_date: string | null
          name: string
          phone: string
          email: string | null
          source: "manual" | "site" | "whatsapp" | "instagram" | "indicacao" | "outro"
          stage: "novo" | "contato" | "visita" | "proposta" | "negociacao" | "ganho" | "perdido"
          budget_brl: number | null
          notes: string
          next_contact_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          property_id?: string | null
          assigned_agent_id?: string | null
          consent_at?: string | null
          birth_date?: string | null
          name: string
          phone?: string
          email?: string | null
          source?: "manual" | "site" | "whatsapp" | "instagram" | "indicacao" | "outro"
          stage?: "novo" | "contato" | "visita" | "proposta" | "negociacao" | "ganho" | "perdido"
          budget_brl?: number | null
          notes?: string
          next_contact_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          property_id?: string | null
          assigned_agent_id?: string | null
          consent_at?: string | null
          birth_date?: string | null
          name?: string
          phone?: string
          email?: string | null
          source?: "manual" | "site" | "whatsapp" | "instagram" | "indicacao" | "outro"
          stage?: "novo" | "contato" | "visita" | "proposta" | "negociacao" | "ganho" | "perdido"
          budget_brl?: number | null
          notes?: string
          next_contact_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_visits: {
        Row: {
          id: string
          agency_id: string
          lead_id: string
          property_id: string
          scheduled_at: string
          status: "agendada" | "realizada" | "cancelada"
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          lead_id: string
          property_id: string
          scheduled_at: string
          status?: "agendada" | "realizada" | "cancelada"
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          lead_id?: string
          property_id?: string
          scheduled_at?: string
          status?: "agendada" | "realizada" | "cancelada"
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_deals: {
        Row: {
          id: string
          agency_id: string
          lead_id: string
          property_id: string | null
          title: string
          amount_brl: number
          status: "proposta" | "negociacao" | "ganho" | "perdido"
          expected_close_date: string | null
          closed_at: string | null
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          lead_id: string
          property_id?: string | null
          title: string
          amount_brl?: number
          status?: "proposta" | "negociacao" | "ganho" | "perdido"
          expected_close_date?: string | null
          closed_at?: string | null
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          lead_id?: string
          property_id?: string | null
          title?: string
          amount_brl?: number
          status?: "proposta" | "negociacao" | "ganho" | "perdido"
          expected_close_date?: string | null
          closed_at?: string | null
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_salespeople: {
        Row: {
          id: string
          agency_id: string
          user_id: string
          name: string
          email: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          user_id: string
          name: string
          email: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          user_id?: string
          name?: string
          email?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      crm_settings: {
        Row: {
          agency_id: string
          plan: "essencial" | "profissional" | "premium" | "personalizado"
          max_users: number
        }
        Insert: {
          agency_id: string
          plan?: "essencial" | "profissional" | "premium" | "personalizado"
          max_users?: number
        }
        Update: {
          agency_id?: string
          plan?: "essencial" | "profissional" | "premium" | "personalizado"
          max_users?: number
        }
        Relationships: []
      }
      agencies: {
        Row: {
          about: string
          active: boolean
          address: string | null
          background_color: string
          created_at: string
          custom_domain: string | null
          email: string | null
          hero_text_color: string
          hero_url: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          tagline: string
          text_color: string
          whatsapp: string | null
        }
        Insert: {
          about?: string
          active?: boolean
          address?: string | null
          background_color?: string
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          hero_text_color?: string
          hero_url?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          primary_color?: string
          secondary_color?: string
          slug: string
          tagline?: string
          text_color?: string
          whatsapp?: string | null
        }
        Update: {
          about?: string
          active?: boolean
          address?: string | null
          background_color?: string
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          hero_text_color?: string
          hero_url?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string
          secondary_color?: string
          slug?: string
          tagline?: string
          text_color?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      agency_billing: {
        Row: {
          agency_id: string
          amount_brl: number
          billing_frequency: string
          billing_whatsapp: string | null
          last_paid_date: string | null
          next_due_date: string | null
          notes: string
          payment_status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount_brl?: number
          billing_frequency?: string
          billing_whatsapp?: string | null
          last_paid_date?: string | null
          next_due_date?: string | null
          notes?: string
          payment_status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount_brl?: number
          billing_frequency?: string
          billing_whatsapp?: string | null
          last_paid_date?: string | null
          next_due_date?: string | null
          notes?: string
          payment_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_billing_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          agency_id: string
          bathrooms: number
          bedrooms: number
          built_area: number | null
          cep: string | null
          city: string
          cover_image_url: string | null
          created_at: string
          description: string
          featured: boolean
          features: string[]
          id: string
          land_area: number | null
          latitude: number | null
          longitude: number | null
          neighborhood: string
          parking: number
          price: number
          property_type: string
          published: boolean
          purpose: string
          show_address: boolean
          slug: string
          state: string
          status: string
          suites: number
          title: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          agency_id: string
          bathrooms?: number
          bedrooms?: number
          built_area?: number | null
          cep?: string | null
          city: string
          cover_image_url?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          features?: string[]
          id?: string
          land_area?: number | null
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          parking?: number
          price: number
          property_type: string
          published?: boolean
          purpose: string
          show_address?: boolean
          slug: string
          state: string
          status?: string
          suites?: number
          title: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string
          bathrooms?: number
          bedrooms?: number
          built_area?: number | null
          cep?: string | null
          city?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          features?: string[]
          id?: string
          land_area?: number | null
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          parking?: number
          price?: number
          property_type?: string
          published?: boolean
          purpose?: string
          show_address?: boolean
          slug?: string
          state?: string
          status?: string
          suites?: number
          title?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          id: string
          position: number
          property_id: string
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          property_id: string
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          property_id?: string
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crm_capture_interest: { Args: { _property_id: string; _name: string; _phone: string; _email?: string | null }; Returns: boolean }
      crm_assign_salesperson: { Args: { _agency: string; _email: string; _name: string }; Returns: string }
      crm_toggle_salesperson: { Args: { _agent: string; _active: boolean }; Returns: undefined }
      crm_is_agent: { Args: { _agency: string }; Returns: boolean }
      crm_is_manager: { Args: { _agency: string }; Returns: boolean }
      crm_is_owner: { Args: { _agency: string }; Returns: boolean }
      crm_count_seats: { Args: { _agency: string }; Returns: number }
      crm_max_users: { Args: { _agency: string }; Returns: number }
      assign_agency_member: {
        Args: { _agency_id: string; _email: string; _role: string }
        Returns: string
      }
      can_edit_brand: { Args: { _agency_id: string }; Returns: boolean }
      can_manage_agency: { Args: { _agency_id: string }; Returns: boolean }
      can_manage_property_image_path: {
        Args: { _path: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_agency_users_admin: {
        Args: never
        Returns: {
          agency_id: string
          email: string
          role: string
          user_id: string
        }[]
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
      app_role: ["admin", "user"],
    },
  },
} as const
