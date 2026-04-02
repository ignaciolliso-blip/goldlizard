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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analysis_snapshots: {
        Row: {
          actual_price: number | null
          asset: string
          briefing: string
          created_at: string
          dashboard_data: string
          id: string
          period_label: string | null
          predicted_price: number | null
          price_at_prediction: number | null
          target_date: string | null
        }
        Insert: {
          actual_price?: number | null
          asset: string
          briefing: string
          created_at?: string
          dashboard_data: string
          id?: string
          period_label?: string | null
          predicted_price?: number | null
          price_at_prediction?: number | null
          target_date?: string | null
        }
        Update: {
          actual_price?: number | null
          asset?: string
          briefing?: string
          created_at?: string
          dashboard_data?: string
          id?: string
          period_label?: string | null
          predicted_price?: number | null
          price_at_prediction?: number | null
          target_date?: string | null
        }
        Relationships: []
      }
      central_bank_gold: {
        Row: {
          bar_coin_tonnes: number
          created_at: string
          id: number
          quarter: string
          tonnes: number
        }
        Insert: {
          bar_coin_tonnes?: number
          created_at?: string
          id?: number
          quarter: string
          tonnes: number
        }
        Update: {
          bar_coin_tonnes?: number
          created_at?: string
          id?: number
          quarter?: string
          tonnes?: number
        }
        Relationships: []
      }
      data_cache: {
        Row: {
          data_json: Json
          last_fetched: string
          series_id: string
        }
        Insert: {
          data_json: Json
          last_fetched?: string
          series_id: string
        }
        Update: {
          data_json?: Json
          last_fetched?: string
          series_id?: string
        }
        Relationships: []
      }
      etf_flows: {
        Row: {
          created_at: string
          flows_usd_bn: number
          holdings_tonnes: number
          id: number
          month: string
        }
        Insert: {
          created_at?: string
          flows_usd_bn?: number
          holdings_tonnes?: number
          id?: number
          month: string
        }
        Update: {
          created_at?: string
          flows_usd_bn?: number
          holdings_tonnes?: number
          id?: number
          month?: string
        }
        Relationships: []
      }
      etf_holdings: {
        Row: {
          company: string
          etf_ticker: string
          id: number
          jurisdiction: string
          market_cap_usd: string
          stage: string
          ticker: string
          updated_at: string
          weight_pct: number
        }
        Insert: {
          company: string
          etf_ticker?: string
          id?: never
          jurisdiction?: string
          market_cap_usd?: string
          stage?: string
          ticker: string
          updated_at?: string
          weight_pct?: number
        }
        Update: {
          company?: string
          etf_ticker?: string
          id?: never
          jurisdiction?: string
          market_cap_usd?: string
          stage?: string
          ticker?: string
          updated_at?: string
          weight_pct?: number
        }
        Relationships: []
      }
      miner_prices: {
        Row: {
          close_price: number
          created_at: string
          date: string
          id: number
          ticker: string
        }
        Insert: {
          close_price: number
          created_at?: string
          date: string
          id?: never
          ticker?: string
        }
        Update: {
          close_price?: number
          created_at?: string
          date?: string
          id?: never
          ticker?: string
        }
        Relationships: []
      }
      miner_valuations: {
        Row: {
          aisc_per_oz: number | null
          commodity: string
          company: string
          ev_per_lb: number
          id: number
          jurisdiction: string
          nav_usd_bn: number
          p_nav: number
          resources_mlb: number
          stage: string
          ticker: string
          updated_at: string
        }
        Insert: {
          aisc_per_oz?: number | null
          commodity?: string
          company: string
          ev_per_lb?: number
          id?: never
          jurisdiction?: string
          nav_usd_bn?: number
          p_nav?: number
          resources_mlb?: number
          stage?: string
          ticker: string
          updated_at?: string
        }
        Update: {
          aisc_per_oz?: number | null
          commodity?: string
          company?: string
          ev_per_lb?: number
          id?: never
          jurisdiction?: string
          nav_usd_bn?: number
          p_nav?: number
          resources_mlb?: number
          stage?: string
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
      narrator_cache: {
        Row: {
          briefing_text: string
          data_hash: string
          generated_at: string
          id: number
        }
        Insert: {
          briefing_text?: string
          data_hash?: string
          generated_at?: string
          id?: number
        }
        Update: {
          briefing_text?: string
          data_hash?: string
          generated_at?: string
          id?: number
        }
        Relationships: []
      }
      scenario_targets: {
        Row: {
          config_json: Json
          id: number
          updated_at: string
        }
        Insert: {
          config_json?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          config_json?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      sector_pnav_history: {
        Row: {
          commodity: string
          commodity_price: number | null
          created_at: string
          date: string
          id: number
          notes: string
          sector_avg_pnav: number
          source: string
          uranium_lt_contract: number | null
          uranium_spot: number
        }
        Insert: {
          commodity?: string
          commodity_price?: number | null
          created_at?: string
          date: string
          id?: never
          notes?: string
          sector_avg_pnav?: number
          source?: string
          uranium_lt_contract?: number | null
          uranium_spot?: number
        }
        Update: {
          commodity?: string
          commodity_price?: number | null
          created_at?: string
          date?: string
          id?: never
          notes?: string
          sector_avg_pnav?: number
          source?: string
          uranium_lt_contract?: number | null
          uranium_spot?: number
        }
        Relationships: []
      }
      uranium_prices: {
        Row: {
          created_at: string
          date: string
          id: number
          lt_contract_price: number | null
          spot_price: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: never
          lt_contract_price?: number | null
          spot_price: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: never
          lt_contract_price?: number | null
          spot_price?: number
        }
        Relationships: []
      }
      uranium_reactors: {
        Row: {
          capacity_gw: number
          created_at: string
          id: number
          operating: number
          planned: number
          under_construction: number
          year: number
        }
        Insert: {
          capacity_gw?: number
          created_at?: string
          id?: never
          operating?: number
          planned?: number
          under_construction?: number
          year: number
        }
        Update: {
          capacity_gw?: number
          created_at?: string
          id?: never
          operating?: number
          planned?: number
          under_construction?: number
          year?: number
        }
        Relationships: []
      }
      uranium_supply_demand: {
        Row: {
          contracting_mlb: number
          created_at: string
          id: number
          mine_production_mlb: number
          quarter: string
          reactor_demand_mlb: number
          secondary_supply_mlb: number
        }
        Insert: {
          contracting_mlb?: number
          created_at?: string
          id?: never
          mine_production_mlb?: number
          quarter: string
          reactor_demand_mlb?: number
          secondary_supply_mlb?: number
        }
        Update: {
          contracting_mlb?: number
          created_at?: string
          id?: never
          mine_production_mlb?: number
          quarter?: string
          reactor_demand_mlb?: number
          secondary_supply_mlb?: number
        }
        Relationships: []
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
      variable_explanations: {
        Row: {
          data_hash: string
          explanation_text: string
          generated_at: string
          variable_id: string
        }
        Insert: {
          data_hash?: string
          explanation_text?: string
          generated_at?: string
          variable_id: string
        }
        Update: {
          data_hash?: string
          explanation_text?: string
          generated_at?: string
          variable_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
