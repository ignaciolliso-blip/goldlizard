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
      forecast_log: {
        Row: {
          actual_price_at_check: number | null
          asset: string
          basis: string | null
          checked_at: string | null
          created_at: string | null
          id: number
          metadata: Json | null
          price_at_creation: number | null
          target_1y: number | null
          target_3y: number | null
          verdict: string | null
        }
        Insert: {
          actual_price_at_check?: number | null
          asset: string
          basis?: string | null
          checked_at?: string | null
          created_at?: string | null
          id?: number
          metadata?: Json | null
          price_at_creation?: number | null
          target_1y?: number | null
          target_3y?: number | null
          verdict?: string | null
        }
        Update: {
          actual_price_at_check?: number | null
          asset?: string
          basis?: string | null
          checked_at?: string | null
          created_at?: string | null
          id?: number
          metadata?: Json | null
          price_at_creation?: number | null
          target_1y?: number | null
          target_3y?: number | null
          verdict?: string | null
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
      solana_agent_metrics: {
        Row: {
          agent_pct_of_total_txns: number | null
          created_at: string | null
          date: string
          id: number
          notes: string | null
          source: string | null
          total_daily_transactions: number | null
          x402_daily_transactions: number | null
          x402_daily_volume_usd: number | null
        }
        Insert: {
          agent_pct_of_total_txns?: number | null
          created_at?: string | null
          date: string
          id?: number
          notes?: string | null
          source?: string | null
          total_daily_transactions?: number | null
          x402_daily_transactions?: number | null
          x402_daily_volume_usd?: number | null
        }
        Update: {
          agent_pct_of_total_txns?: number | null
          created_at?: string | null
          date?: string
          id?: number
          notes?: string | null
          source?: string | null
          total_daily_transactions?: number | null
          x402_daily_transactions?: number | null
          x402_daily_volume_usd?: number | null
        }
        Relationships: []
      }
      solana_daily_history: {
        Row: {
          annualised_fees: number | null
          btc_price: number | null
          created_at: string | null
          daily_active_addresses: number | null
          daily_fees_usd: number | null
          daily_revenue_usd: number | null
          daily_transactions: number | null
          date: string
          eth_daily_fees: number | null
          eth_price: number | null
          fdv_fee_ratio: number | null
          id: number
          sol_fdv: number | null
          sol_market_cap: number | null
          sol_price: number | null
          sol_volume_24h: number | null
          stablecoin_supply_usd: number | null
          tvl_usd: number | null
        }
        Insert: {
          annualised_fees?: number | null
          btc_price?: number | null
          created_at?: string | null
          daily_active_addresses?: number | null
          daily_fees_usd?: number | null
          daily_revenue_usd?: number | null
          daily_transactions?: number | null
          date: string
          eth_daily_fees?: number | null
          eth_price?: number | null
          fdv_fee_ratio?: number | null
          id?: number
          sol_fdv?: number | null
          sol_market_cap?: number | null
          sol_price?: number | null
          sol_volume_24h?: number | null
          stablecoin_supply_usd?: number | null
          tvl_usd?: number | null
        }
        Update: {
          annualised_fees?: number | null
          btc_price?: number | null
          created_at?: string | null
          daily_active_addresses?: number | null
          daily_fees_usd?: number | null
          daily_revenue_usd?: number | null
          daily_transactions?: number | null
          date?: string
          eth_daily_fees?: number | null
          eth_price?: number | null
          fdv_fee_ratio?: number | null
          id?: number
          sol_fdv?: number | null
          sol_market_cap?: number | null
          sol_price?: number | null
          sol_volume_24h?: number | null
          stablecoin_supply_usd?: number | null
          tvl_usd?: number | null
        }
        Relationships: []
      }
      solana_metrics: {
        Row: {
          fetched_at: string | null
          id: number
          metric_name: string
          source: string
          value: number | null
          value_text: string | null
        }
        Insert: {
          fetched_at?: string | null
          id?: number
          metric_name: string
          source: string
          value?: number | null
          value_text?: string | null
        }
        Update: {
          fetched_at?: string | null
          id?: number
          metric_name?: string
          source?: string
          value?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      uranium_miner_financials: {
        Row: {
          annual_production_mlb: number | null
          cash_usd_bn: number | null
          ebitda_usd_bn: number | null
          ev_usd_bn: number | null
          fetched_at: string
          id: string
          market_cap_usd_bn: number | null
          share_price: number | null
          shares_outstanding_bn: number | null
          ticker: string
          total_debt_usd_bn: number | null
        }
        Insert: {
          annual_production_mlb?: number | null
          cash_usd_bn?: number | null
          ebitda_usd_bn?: number | null
          ev_usd_bn?: number | null
          fetched_at?: string
          id?: string
          market_cap_usd_bn?: number | null
          share_price?: number | null
          shares_outstanding_bn?: number | null
          ticker: string
          total_debt_usd_bn?: number | null
        }
        Update: {
          annual_production_mlb?: number | null
          cash_usd_bn?: number | null
          ebitda_usd_bn?: number | null
          ev_usd_bn?: number | null
          fetched_at?: string
          id?: string
          market_cap_usd_bn?: number | null
          share_price?: number | null
          shares_outstanding_bn?: number | null
          ticker?: string
          total_debt_usd_bn?: number | null
        }
        Relationships: []
      }
      uranium_miner_universe: {
        Row: {
          annual_production_mlb: number | null
          capex_source_url: string | null
          capex_to_production_usd_m: number | null
          company: string
          created_at: string
          id: string
          jurisdiction_hq: string | null
          jurisdiction_operations: string
          last_ai_extraction: string | null
          notes: string | null
          optionality_narrative: string | null
          optionality_source_url: string | null
          production_source_url: string | null
          resources_approved: boolean | null
          resources_mlb: number | null
          resources_source_date: string | null
          resources_source_url: string | null
          stage: string
          ticker: string
          updated_at: string
        }
        Insert: {
          annual_production_mlb?: number | null
          capex_source_url?: string | null
          capex_to_production_usd_m?: number | null
          company: string
          created_at?: string
          id?: string
          jurisdiction_hq?: string | null
          jurisdiction_operations: string
          last_ai_extraction?: string | null
          notes?: string | null
          optionality_narrative?: string | null
          optionality_source_url?: string | null
          production_source_url?: string | null
          resources_approved?: boolean | null
          resources_mlb?: number | null
          resources_source_date?: string | null
          resources_source_url?: string | null
          stage: string
          ticker: string
          updated_at?: string
        }
        Update: {
          annual_production_mlb?: number | null
          capex_source_url?: string | null
          capex_to_production_usd_m?: number | null
          company?: string
          created_at?: string
          id?: string
          jurisdiction_hq?: string | null
          jurisdiction_operations?: string
          last_ai_extraction?: string | null
          notes?: string | null
          optionality_narrative?: string | null
          optionality_source_url?: string | null
          production_source_url?: string | null
          resources_approved?: boolean | null
          resources_mlb?: number | null
          resources_source_date?: string | null
          resources_source_url?: string | null
          stage?: string
          ticker?: string
          updated_at?: string
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
