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
          id: string
          name: string
          slug: string
          whatsapp: string | null
          email: string | null
          created_at: string
          logo_url: string | null
          hero_url: string | null
          tagline: string
          about: string
          address: string | null
          instagram: string | null
          primary_color: string
          secondary_color: string
          background_color: string
          active: boolean
          custom_domain: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          whatsapp?: string | null
          email?: string | null
          created_at?: string
          logo_url?: string | null
          hero_url?: string | null
          tagline?: string
          about?: string
          address?: string | null
          instagram?: string | null
          primary_color?: string
          secondary_color?: string
          background_color?: string
          active?: boolean
          custom_domain?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          whatsapp?: string | null
          email?: string | null
          created_at?: string
          logo_url?: string | null
          hero_url?: string | null
          tagline?: string
          about?: string
          address?: string | null
          instagram?: string | null
          primary_color?: string
          secondary_color?: string
          background_color?: string
          active?: boolean
          custom_domain?: string | null
        }
        Relationships: []
      }
      agency_billing: {
        Row: {
          agency_id: string
          amount_brl: number
          billing_frequency: "mensal" | "trimestral" | "anual" | "unico"
          next_due_date: string | null
          last_paid_date: string | null
          payment_status: "nao_definido" | "pendente" | "pago" | "atrasado"
          billing_whatsapp: string | null
          notes: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount_brl?: number
          billing_frequency?: "mensal" | "trimestral" | "anual" | "unico"
          next_due_date?: string | null
          last_paid_date?: string | null
          payment_status?: "nao_definido" | "pendente" | "pago" | "atrasado"
          billing_whatsapp?: string | null
          notes?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount_brl?: number
          billing_frequency?: "mensal" | "trimestral" | "anual" | "unico"
          next_due_date?: string | null
          last_paid_date?: string | null
          payment_status?: "nao_definido" | "pendente" | "pago" | "atrasado"
          billing_whatsapp?: string | null
          notes?: string
          updated_at?: string
        }
        Relationships: [{
          foreignKeyName: "agency_billing_agency_id_fkey"
          columns: ["agency_id"]
          isOneToOne: true
          referencedRelation: "agencies"
          referencedColumns: ["id"]
        }]
      }
      agency_members: {
        Row: { agency_id: string; user_id: string; role: string; created_at: string }
        Insert: { agency_id: string; user_id: string; role: string; created_at?: string }
        Update: { agency_id?: string; user_id?: string; role?: string; created_at?: string }
        Relationships: [{
          foreignKeyName: "agency_members_agency_id_fkey"
          columns: ["agency_id"]
          isOneToOne: false
          referencedRelation: "agencies"
          referencedColumns: ["id"]
        }]
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
      can_manage_agency: { Args: { _agency_id: string }; Returns: boolean }
      can_edit_brand: { Args: { _agency_id: string }; Returns: boolean }
      assign_agency_member: { Args: { _agency_id: string; _email: string; _role: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
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
