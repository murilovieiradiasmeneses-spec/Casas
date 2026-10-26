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
          {
            foreignKeyName: "agency_billing_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "public_agency_profiles"
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
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agency_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_broker_invitations: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          name: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          name: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          name?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_broker_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_broker_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agency_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          agency_id: string
          amount_brl: number
          closed_at: string | null
          created_at: string
          expected_close_date: string | null
          id: string
          lead_id: string
          notes: string
          property_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount_brl?: number
          closed_at?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          lead_id: string
          notes?: string
          property_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount_brl?: number
          closed_at?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string
          notes?: string
          property_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          agency_id: string
          assigned_agent_id: string | null
          birth_date: string | null
          budget_brl: number | null
          consent_at: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          next_contact_at: string | null
          notes: string
          phone: string
          property_id: string | null
          source: string
          stage: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_agent_id?: string | null
          birth_date?: string | null
          budget_brl?: number | null
          consent_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          next_contact_at?: string | null
          notes?: string
          phone?: string
          property_id?: string | null
          source?: string
          stage?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_agent_id?: string | null
          birth_date?: string | null
          budget_brl?: number | null
          consent_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          next_contact_at?: string | null
          notes?: string
          phone?: string
          property_id?: string | null
          source?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "crm_salespeople"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_salespeople: {
        Row: {
          active: boolean
          agency_id: string
          created_at: string
          email: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean
          agency_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          active?: boolean
          agency_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_salespeople_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_salespeople_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agency_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          agency_id: string
          max_users: number
          plan: string
        }
        Insert: {
          agency_id: string
          max_users?: number
          plan?: string
        }
        Update: {
          agency_id?: string
          max_users?: number
          plan?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "public_agency_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_visits: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          lead_id: string
          notes: string
          property_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string
          property_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string
          property_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_visits_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visits_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
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
          income_max: number | null
          income_min: number | null
          is_off_plan: boolean
          land_area: number | null
          latitude: number | null
          longitude: number | null
          neighborhood: string
          parking: number
          price: number
          price_display_type: string
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
          income_max?: number | null
          income_min?: number | null
          is_off_plan?: boolean
          land_area?: number | null
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          parking?: number
          price: number
          price_display_type?: string
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
          income_max?: number | null
          income_min?: number | null
          is_off_plan?: boolean
          land_area?: number | null
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          parking?: number
          price?: number
          price_display_type?: string
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
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agency_profiles"
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
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_property_listings"
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
      public_agency_profiles: {
        Row: {
          about: string | null
          active: boolean | null
          address: string | null
          background_color: string | null
          email: string | null
          hero_text_color: string | null
          hero_url: string | null
          id: string | null
          instagram: string | null
          logo_url: string | null
          name: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          tagline: string | null
          text_color: string | null
          whatsapp: string | null
        }
        Insert: {
          about?: string | null
          active?: boolean | null
          address?: string | null
          background_color?: string | null
          email?: string | null
          hero_text_color?: string | null
          hero_url?: string | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          tagline?: string | null
          text_color?: string | null
          whatsapp?: string | null
        }
        Update: {
          about?: string | null
          active?: boolean | null
          address?: string | null
          background_color?: string | null
          email?: string | null
          hero_text_color?: string | null
          hero_url?: string | null
          id?: string | null
          instagram?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          tagline?: string | null
          text_color?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      public_property_listings: {
        Row: {
          address: string | null
          agency_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          built_area: number | null
          cep: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          features: string[] | null
          id: string | null
          income_max: number | null
          income_min: number | null
          is_off_plan: boolean | null
          land_area: number | null
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          parking: number | null
          price: number | null
          price_display_type: string | null
          property_type: string | null
          published: boolean | null
          purpose: string | null
          show_address: boolean | null
          slug: string | null
          state: string | null
          status: string | null
          suites: number | null
          title: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_agency_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      master_change_agency_login: { Args: { _agency: string; _old_user: string; _new_email: string }; Returns: string }
      activate_agency_login_change: { Args: { _agency: string }; Returns: boolean }
      master_list_agency_login_changes: {
        Args: Record<PropertyKey, never>
        Returns: { id:string;agency_id:string;old_user_id:string;old_email:string;target_email:string;member_role:string;created_at:string;expires_at:string }[]
      }
      master_cancel_agency_login_change: { Args: { _id: string }; Returns: boolean }
      crm_authorize_broker: { Args: { _agency: string; _email: string; _name: string }; Returns: string }
      crm_activate_authorized_broker: { Args: { _agency: string }; Returns: boolean }
      crm_list_authorized_brokers: { Args: { _agency: string }; Returns: { id: string; name: string; email: string; state: string; authorized_at: string; activated_at: string | null }[] }
      crm_revoke_broker: { Args: { _agency: string; _email: string }; Returns: boolean }
      crm_reserved_seats: { Args: { _agency: string }; Returns: number }
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
      can_read_public_property_photo: {
        Args: { _path: string }
        Returns: boolean
      }
      crm_assign_salesperson: {
        Args: { _agency: string; _email: string; _name: string }
        Returns: string
      }
      crm_can_read_lead: { Args: { _lead: string }; Returns: boolean }
      crm_capture_interest: {
        Args: {
          _email?: string
          _name: string
          _phone: string
          _property_id: string
        }
        Returns: boolean
      }
      crm_count_seats: { Args: { _agency: string }; Returns: number }
      crm_create_broker_invite: {
        Args: { _agency: string; _email: string; _name: string }
        Returns: string
      }
      crm_invite_details: {
        Args: { _token: string }
        Returns: {
          agency_name: string
          broker_name: string
          email: string
          expires_at: string
        }[]
      }
      crm_is_agent: { Args: { _agency: string }; Returns: boolean }
      crm_is_manager: { Args: { _agency: string }; Returns: boolean }
      crm_is_owner: { Args: { _agency: string }; Returns: boolean }
      crm_max_users: { Args: { _agency: string }; Returns: number }
      crm_redeem_broker_invite: { Args: { _token: string }; Returns: boolean }
      crm_toggle_salesperson: {
        Args: { _active: boolean; _agent: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_published_active_property: {
        Args: { _property_id: string }
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
