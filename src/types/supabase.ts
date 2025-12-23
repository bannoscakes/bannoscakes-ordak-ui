/**
 * Supabase Database Types
 * Auto-generated from Supabase schema
 *
 * Regenerate with: npm run gen:types
 */

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
      accessories: {
        Row: {
          category: string
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          min_stock: number
          name: string
          product_match: string
          shopify_variant_id: string | null
          sku: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          product_match: string
          shopify_variant_id?: string | null
          sku: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          product_match?: string
          shopify_variant_id?: string | null
          sku?: string
          updated_at?: string
        }
        Relationships: []
      }
      bom_items: {
        Row: {
          bom_id: string
          component_id: string
          created_at: string | null
          id: string
          inventory_item_id: string | null
          is_optional: boolean | null
          metadata: Json
          notes: string | null
          quantity_required: number
          stage: string | null
          stage_to_consume: string | null
          store: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          bom_id: string
          component_id: string
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          is_optional?: boolean | null
          metadata?: Json
          notes?: string | null
          quantity_required: number
          stage?: string | null
          stage_to_consume?: string | null
          store?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          bom_id?: string
          component_id?: string
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          is_optional?: boolean | null
          metadata?: Json
          notes?: string | null
          quantity_required?: number
          stage?: string | null
          stage_to_consume?: string | null
          store?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      boms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          product_title: string
          shopify_product_id: string | null
          store: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          product_title: string
          shopify_product_id?: string | null
          store?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          product_title?: string
          shopify_product_id?: string | null
          store?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      breaks: {
        Row: {
          created_at: string | null
          end_ts: string | null
          id: string
          shift_id: string
          start_ts: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_ts?: string | null
          id?: string
          shift_id: string
          start_ts?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_ts?: string | null
          id?: string
          shift_id?: string
          start_ts?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cake_toppers: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          min_stock: number
          name_1: string
          name_2: string | null
          shopify_product_id_1: string | null
          shopify_product_id_2: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock?: number
          name_1: string
          name_2?: string | null
          shopify_product_id_1?: string | null
          shopify_product_id_2?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock?: number
          name_1?: string
          name_2?: string | null
          shopify_product_id_1?: string | null
          shopify_product_id_2?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      components: {
        Row: {
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_stock: number | null
          min_stock: number | null
          name: string
          sku: string
          supplier: string | null
          supplier_sku: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name: string
          sku: string
          supplier?: string | null
          supplier_sku?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          sku?: string
          supplier?: string | null
          supplier_sku?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orders_bannos: {
        Row: {
          accessories: Json | null
          assignee_id: string | null
          cake_writing: string | null
          covering_complete_ts: string | null
          covering_start_ts: string | null
          created_at: string | null
          currency: string | null
          customer_name: string | null
          decorating_complete_ts: string | null
          decorating_start_ts: string | null
          delivery_method: string | null
          due_date: string | null
          due_date_text: string | null
          filling_complete_ts: string | null
          filling_start_ts: string | null
          flavour: string | null
          human_id: string | null
          id: string
          item_qty: number | null
          metafield_status: string | null
          notes: string | null
          order_json: Json | null
          packing_complete_ts: string | null
          packing_start_ts: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          product_image: string | null
          product_title: string | null
          row_id: string
          shopify_order_gid: string | null
          shopify_order_id: number | null
          shopify_order_number: number | null
          size: string | null
          stage: Database["public"]["Enums"]["stage_type"]
          storage: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          accessories?: Json | null
          assignee_id?: string | null
          cake_writing?: string | null
          covering_complete_ts?: string | null
          covering_start_ts?: string | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string | null
          decorating_complete_ts?: string | null
          decorating_start_ts?: string | null
          delivery_method?: string | null
          due_date?: string | null
          due_date_text?: string | null
          filling_complete_ts?: string | null
          filling_start_ts?: string | null
          flavour?: string | null
          human_id?: string | null
          id: string
          item_qty?: number | null
          metafield_status?: string | null
          notes?: string | null
          order_json?: Json | null
          packing_complete_ts?: string | null
          packing_start_ts?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          product_image?: string | null
          product_title?: string | null
          row_id?: string
          shopify_order_gid?: string | null
          shopify_order_id?: number | null
          shopify_order_number?: number | null
          size?: string | null
          stage?: Database["public"]["Enums"]["stage_type"]
          storage?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          accessories?: Json | null
          assignee_id?: string | null
          cake_writing?: string | null
          covering_complete_ts?: string | null
          covering_start_ts?: string | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string | null
          decorating_complete_ts?: string | null
          decorating_start_ts?: string | null
          delivery_method?: string | null
          due_date?: string | null
          due_date_text?: string | null
          filling_complete_ts?: string | null
          filling_start_ts?: string | null
          flavour?: string | null
          human_id?: string | null
          id?: string
          item_qty?: number | null
          metafield_status?: string | null
          notes?: string | null
          order_json?: Json | null
          packing_complete_ts?: string | null
          packing_start_ts?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          product_image?: string | null
          product_title?: string | null
          row_id?: string
          shopify_order_gid?: string | null
          shopify_order_id?: number | null
          shopify_order_number?: number | null
          size?: string | null
          stage?: Database["public"]["Enums"]["stage_type"]
          storage?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      orders_flourlane: {
        Row: {
          accessories: Json | null
          assignee_id: string | null
          cake_writing: string | null
          covering_complete_ts: string | null
          covering_start_ts: string | null
          created_at: string | null
          currency: string | null
          customer_name: string | null
          decorating_complete_ts: string | null
          decorating_start_ts: string | null
          delivery_method: string | null
          due_date: string | null
          due_date_text: string | null
          filling_complete_ts: string | null
          filling_start_ts: string | null
          flavour: string | null
          human_id: string | null
          id: string
          item_qty: number | null
          metafield_status: string | null
          notes: string | null
          order_json: Json | null
          packing_complete_ts: string | null
          packing_start_ts: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          product_image: string | null
          product_title: string | null
          row_id: string
          shopify_order_gid: string | null
          shopify_order_id: number | null
          shopify_order_number: number | null
          size: string | null
          stage: Database["public"]["Enums"]["stage_type"]
          storage: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          accessories?: Json | null
          assignee_id?: string | null
          cake_writing?: string | null
          covering_complete_ts?: string | null
          covering_start_ts?: string | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string | null
          decorating_complete_ts?: string | null
          decorating_start_ts?: string | null
          delivery_method?: string | null
          due_date?: string | null
          due_date_text?: string | null
          filling_complete_ts?: string | null
          filling_start_ts?: string | null
          flavour?: string | null
          human_id?: string | null
          id: string
          item_qty?: number | null
          metafield_status?: string | null
          notes?: string | null
          order_json?: Json | null
          packing_complete_ts?: string | null
          packing_start_ts?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          product_image?: string | null
          product_title?: string | null
          row_id?: string
          shopify_order_gid?: string | null
          shopify_order_id?: number | null
          shopify_order_number?: number | null
          size?: string | null
          stage?: Database["public"]["Enums"]["stage_type"]
          storage?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          accessories?: Json | null
          assignee_id?: string | null
          cake_writing?: string | null
          covering_complete_ts?: string | null
          covering_start_ts?: string | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string | null
          decorating_complete_ts?: string | null
          decorating_start_ts?: string | null
          delivery_method?: string | null
          due_date?: string | null
          due_date_text?: string | null
          filling_complete_ts?: string | null
          filling_start_ts?: string | null
          flavour?: string | null
          human_id?: string | null
          id?: string
          item_qty?: number | null
          metafield_status?: string | null
          notes?: string | null
          order_json?: Json | null
          packing_complete_ts?: string | null
          packing_start_ts?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          product_image?: string | null
          product_title?: string | null
          row_id?: string
          shopify_order_gid?: string | null
          shopify_order_id?: number | null
          shopify_order_number?: number | null
          size?: string | null
          stage?: Database["public"]["Enums"]["stage_type"]
          storage?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          key: string
          store: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          store: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          store?: string
          value?: Json
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string | null
          end_ts: string | null
          id: string
          staff_id: string
          start_ts: string
          store: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_ts?: string | null
          id?: string
          staff_id: string
          start_ts?: string
          store: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_ts?: string | null
          id?: string
          staff_id?: string
          start_ts?: string
          store?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_shared: {
        Row: {
          approved: boolean
          created_at: string | null
          email: string | null
          full_name: string | null
          hourly_rate: number | null
          is_active: boolean | null
          last_login: string | null
          phone: string | null
          role: string | null
          store: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          role?: string | null
          store: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          role?: string | null
          store?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stage_events: {
        Row: {
          at_ts: string
          event_type: string
          id: string
          meta: Json | null
          ok: boolean | null
          order_id: string
          staff_id: string | null
          stage: string
          store: string
        }
        Insert: {
          at_ts?: string
          event_type: string
          id?: string
          meta?: Json | null
          ok?: boolean | null
          order_id: string
          staff_id?: string | null
          stage: string
          store: string
        }
        Update: {
          at_ts?: string
          event_type?: string
          id?: string
          meta?: Json | null
          ok?: boolean | null
          order_id?: string
          staff_id?: string | null
          stage?: string
          store?: string
        }
        Relationships: []
      }
      stock_transactions: {
        Row: {
          change_amount: number | null
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string | null
          performed_by: string | null
          quantity_after: number | null
          quantity_before: number | null
          quantity_change: number | null
          reason: string | null
          reference: string | null
          reference_order_id: string | null
          stock_after: number | null
          stock_before: number | null
          store: string | null
          table_name: string
          transaction_type: string
        }
        Insert: {
          change_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          performed_by?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          quantity_change?: number | null
          reason?: string | null
          reference?: string | null
          reference_order_id?: string | null
          stock_after?: number | null
          stock_before?: number | null
          store?: string | null
          table_name?: string
          transaction_type: string
        }
        Update: {
          change_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          performed_by?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          quantity_change?: number | null
          reason?: string | null
          reference?: string | null
          reference_order_id?: string | null
          stock_after?: number | null
          stock_before?: number | null
          store?: string | null
          table_name?: string
          transaction_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_queue: {
        Args: {
          p_assignee_id?: string
          p_limit?: number
          p_offset?: number
          p_priority?: string
          p_search?: string
          p_sort_by?: string
          p_sort_order?: string
          p_stage?: string
          p_storage?: string
          p_store?: string
        }
        Returns: {
          assignee_id: string
          assignee_name: string
          covering_start_ts: string
          created_at: string
          currency: string
          customer_name: string
          decorating_start_ts: string
          delivery_method: string
          due_date: string
          flavour: string
          human_id: string
          id: string
          item_qty: number
          notes: string
          priority: Database["public"]["Enums"]["priority_level"]
          product_title: string
          shopify_order_id: number
          shopify_order_number: number
          size: string
          stage: Database["public"]["Enums"]["stage_type"]
          storage: string
          store: string
          total_amount: number
          total_count: number
          updated_at: string
        }[]
      }
      get_queue_stats: {
        Args: { p_store: string }
        Returns: {
          completed_orders: number
          covering_count: number
          decorating_count: number
          filling_count: number
          in_production: number
          packing_count: number
          total_orders: number
          unassigned_orders: number
        }[]
      }
      get_staff_times: {
        Args: { p_from: string; p_staff_id?: string; p_to: string }
        Returns: {
          days_worked: number
          hourly_rate: number
          net_hours: number
          staff_id: string
          staff_name: string
          total_break_minutes: number
          total_pay: number
          total_shift_hours: number
        }[]
      }
      get_staff_times_detail: {
        Args: { p_from: string; p_staff_id: string; p_to: string }
        Returns: {
          break_count: number
          break_minutes: number
          net_hours: number
          notes: string
          shift_date: string
          shift_end: string
          shift_id: string
          shift_start: string
        }[]
      }
      get_settings: {
        Args: { p_store: string }
        Returns: {
          created_at: string
          key: string
          store: string
          value: Json
        }[]
      }
      get_complete: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
          p_sort_order?: string
          p_start_date?: string
          p_store?: string
        }
        Returns: {
          assignee_name: string
          customer_name: string
          delivery_method: string
          due_date: string
          id: string
          order_number: number
          packing_complete_ts: string
          priority: number
          product_title: string
          size: string
          storage: string
          store: string
        }[]
      }
      find_order: {
        Args: { p_search: string }
        Returns: {
          assignee_name: string
          customer_name: string
          delivery_method: string
          due_date: string
          id: string
          order_number: number
          priority: string
          product_title: string
          size: string
          stage: string
          storage: string
          store: string
        }[]
      }
    }
    Enums: {
      priority_level: "High" | "Medium" | "Low"
      stage_type: "Filling" | "Covering" | "Decorating" | "Packing" | "Complete"
    }
    CompositeTypes: {
      scanner_order_result: {
        id: string | null
        shopify_order_number: number | null
        customer_name: string | null
        product_title: string | null
        size: string | null
        notes: string | null
        due_date: string | null
        delivery_method: string | null
        stage: string | null
        priority: string | null
        storage: string | null
        store: string | null
        filling_start_ts: string | null
        covering_start_ts: string | null
        decorating_start_ts: string | null
        filling_complete_ts: string | null
        covering_complete_ts: string | null
        decorating_complete_ts: string | null
        packing_start_ts: string | null
        packing_complete_ts: string | null
      }
    }
  }
}

// =============================================
// HELPER TYPES
// =============================================

/** Extract the return type of an RPC function */
export type RpcResponse<T extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][T]["Returns"]

/** Extract a single row from an RPC function that returns an array */
export type RpcRow<T extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][T]["Returns"] extends (infer U)[] ? U : never

/** Table row types */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

/** Enum types */
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

// =============================================
// COMMONLY USED TYPE ALIASES
// =============================================

/** Queue item returned by get_queue RPC */
export type GetQueueRow = RpcRow<"get_queue">

/** Staff times returned by get_staff_times RPC */
export type GetStaffTimesRow = RpcRow<"get_staff_times">

/** Staff times detail returned by get_staff_times_detail RPC */
export type GetStaffTimesDetailRow = RpcRow<"get_staff_times_detail">

/** Queue stats returned by get_queue_stats RPC */
export type GetQueueStatsRow = RpcRow<"get_queue_stats">

/** Settings row returned by get_settings RPC */
export type GetSettingsRow = RpcRow<"get_settings">

/** Complete order returned by get_complete RPC */
export type GetCompleteRow = RpcRow<"get_complete">

/** Order search result returned by find_order RPC */
export type FindOrderRow = RpcRow<"find_order">

/** Priority level enum */
export type PriorityLevel = Enums<"priority_level">

/** Stage type enum */
export type StageType = Enums<"stage_type">
