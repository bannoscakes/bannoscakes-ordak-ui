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
    PostgrestVersion: "13.0.5"
  }
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
      api_logs: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          route: string
          status: number
          t_ms: number
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          route: string
          status: number
          t_ms: number
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          route?: string
          status?: number
          t_ms?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          meta: Json | null
          performed_by: string | null
          source: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          meta?: Json | null
          performed_by?: string | null
          source?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          meta?: Json | null
          performed_by?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_headers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          product_id: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          product_id: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          product_id?: string
          version?: number
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
        Relationships: [
          {
            foreignKeyName: "bom_items_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "boms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "breaks_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversation_participants_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_shared"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversations_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_shared"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dead_letter: {
        Row: {
          created_at: string
          id: string
          payload: Json
          reason: string
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          reason: string
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          reason?: string
          source?: string
        }
        Relationships: []
      }
      inventory_sync_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          item_id: string
          item_type: string
          processed_at: string | null
          shopify_ids: Json
          status: string
          sync_action: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          item_id: string
          item_type: string
          processed_at?: string | null
          shopify_ids: Json
          status?: string
          sync_action: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          item_id?: string
          item_type?: string
          processed_at?: string | null
          shopify_ids?: Json
          status?: string
          sync_action?: string
        }
        Relationships: []
      }
      inventory_txn: {
        Row: {
          created_at: string
          delta: number
          id: string
          order_id: string | null
          reason: string | null
          sku: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          order_id?: string | null
          reason?: string | null
          sku: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          order_id?: string | null
          reason?: string | null
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_txn_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "complete_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_txn_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_txn_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "queue_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_txn_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "vw_complete_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_txn_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "vw_queue_minimal"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: number
          sender_id: string
          sender_name: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: number
          sender_id: string
          sender_name: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: number
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_sender_id"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "staff_shared"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_photos: {
        Row: {
          created_at: string
          id: string
          order_id: string
          signed_url_expires: string | null
          stage: Database["public"]["Enums"]["stage"] | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          signed_url_expires?: string | null
          stage?: Database["public"]["Enums"]["stage"] | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          signed_url_expires?: string | null
          stage?: Database["public"]["Enums"]["stage"] | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "complete_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "queue_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "vw_complete_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "vw_queue_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assignee_id: string | null
          barcode: string | null
          covering_complete_ts: string | null
          created_at: string
          currency: string | null
          customer_name: string | null
          decorating_complete_ts: string | null
          delivery_date: string | null
          delivery_method: string | null
          due_date: string | null
          filling_complete_ts: string | null
          filling_start_ts: string | null
          flavour: string | null
          human_id: string | null
          id: string
          inventory_blocked: boolean
          item_qty: number | null
          notes: string | null
          order_json: Json | null
          order_number: string | null
          packing_complete_ts: string | null
          packing_start_ts: string | null
          priority: Database["public"]["Enums"]["priority_lvl"]
          product_title: string | null
          shopify_order_gid: string | null
          shopify_order_id: string | null
          shopify_order_number: number | null
          stage: Database["public"]["Enums"]["stage"]
          status_stage: string | null
          storage_location: string | null
          store: string
          title: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          barcode?: string | null
          covering_complete_ts?: string | null
          created_at?: string
          currency?: string | null
          customer_name?: string | null
          decorating_complete_ts?: string | null
          delivery_date?: string | null
          delivery_method?: string | null
          due_date?: string | null
          filling_complete_ts?: string | null
          filling_start_ts?: string | null
          flavour?: string | null
          human_id?: string | null
          id?: string
          inventory_blocked?: boolean
          item_qty?: number | null
          notes?: string | null
          order_json?: Json | null
          order_number?: string | null
          packing_complete_ts?: string | null
          packing_start_ts?: string | null
          priority?: Database["public"]["Enums"]["priority_lvl"]
          product_title?: string | null
          shopify_order_gid?: string | null
          shopify_order_id?: string | null
          shopify_order_number?: number | null
          stage?: Database["public"]["Enums"]["stage"]
          status_stage?: string | null
          storage_location?: string | null
          store: string
          title?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          barcode?: string | null
          covering_complete_ts?: string | null
          created_at?: string
          currency?: string | null
          customer_name?: string | null
          decorating_complete_ts?: string | null
          delivery_date?: string | null
          delivery_method?: string | null
          due_date?: string | null
          filling_complete_ts?: string | null
          filling_start_ts?: string | null
          flavour?: string | null
          human_id?: string | null
          id?: string
          inventory_blocked?: boolean
          item_qty?: number | null
          notes?: string | null
          order_json?: Json | null
          order_number?: string | null
          packing_complete_ts?: string | null
          packing_start_ts?: string | null
          priority?: Database["public"]["Enums"]["priority_lvl"]
          product_title?: string | null
          shopify_order_gid?: string | null
          shopify_order_id?: string | null
          shopify_order_number?: number | null
          stage?: Database["public"]["Enums"]["stage"]
          status_stage?: string | null
          storage_location?: string | null
          store?: string
          title?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_bannos: {
        Row: {
          accessories: Json | null
          assignee_id: string | null
          cake_writing: string | null
          cancelled_at: string | null
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
          cancelled_at?: string | null
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
          cancelled_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "orders_bannos_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "staff_shared"
            referencedColumns: ["user_id"]
          },
        ]
      }
      orders_flourlane: {
        Row: {
          accessories: Json | null
          assignee_id: string | null
          cake_writing: string | null
          cancelled_at: string | null
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
          cancelled_at?: string | null
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
          cancelled_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "orders_flourlane_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "staff_shared"
            referencedColumns: ["user_id"]
          },
        ]
      }
      processed_webhooks: {
        Row: {
          http_hmac: string | null
          id: string
          note: string | null
          received_at: string
          shop_domain: string
          status: string
          topic: string
        }
        Insert: {
          http_hmac?: string | null
          id: string
          note?: string | null
          received_at?: string
          shop_domain: string
          status?: string
          topic: string
        }
        Update: {
          http_hmac?: string | null
          id?: string
          note?: string | null
          received_at?: string
          shop_domain?: string
          status?: string
          topic?: string
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
        Relationships: [
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_shared"
            referencedColumns: ["user_id"]
          },
        ]
      }
      shopify_sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          errors: number | null
          id: string
          metadata: Json | null
          orders_imported: number | null
          orders_skipped: number | null
          products_imported: number | null
          products_skipped: number | null
          started_at: string
          status: string
          store: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          errors?: number | null
          id?: string
          metadata?: Json | null
          orders_imported?: number | null
          orders_skipped?: number | null
          products_imported?: number | null
          products_skipped?: number | null
          started_at?: string
          status?: string
          store: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          errors?: number | null
          id?: string
          metadata?: Json | null
          orders_imported?: number | null
          orders_skipped?: number | null
          products_imported?: number | null
          products_skipped?: number | null
          started_at?: string
          status?: string
          store?: string
          sync_type?: string
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
        Relationships: [
          {
            foreignKeyName: "stage_events_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_shared"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "stock_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff_shared"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          active_shift_id: string | null
          created_at: string
          email: string
          id: string
          role: string
          store_access: string[]
          updated_at: string
        }
        Insert: {
          active_shift_id?: string | null
          created_at?: string
          email: string
          id?: string
          role: string
          store_access?: string[]
          updated_at?: string
        }
        Update: {
          active_shift_id?: string | null
          created_at?: string
          email?: string
          id?: string
          role?: string
          store_access?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      webhook_inbox_bannos: {
        Row: {
          id: string
          payload: Json
          processed: boolean
        }
        Insert: {
          id: string
          payload: Json
          processed?: boolean
        }
        Update: {
          id?: string
          payload?: Json
          processed?: boolean
        }
        Relationships: []
      }
      webhook_inbox_flourlane: {
        Row: {
          id: string
          payload: Json
          processed: boolean
        }
        Insert: {
          id: string
          payload: Json
          processed?: boolean
        }
        Update: {
          id?: string
          payload?: Json
          processed?: boolean
        }
        Relationships: []
      }
      work_queue: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          next_retry_at: string | null
          payload: Json
          retry_count: number
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string | null
          payload: Json
          retry_count?: number
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string | null
          payload?: Json
          retry_count?: number
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      complete_view: {
        Row: {
          created_at: string | null
          human_id: string | null
          id: string | null
          packing_complete_ts: string | null
          storage_location: string | null
          store: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          human_id?: string | null
          id?: string | null
          packing_complete_ts?: string | null
          storage_location?: string | null
          store?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          human_id?: string | null
          id?: string | null
          packing_complete_ts?: string | null
          storage_location?: string | null
          store?: string | null
          title?: string | null
        }
        Relationships: []
      }
      queue_view: {
        Row: {
          assignee_id: string | null
          created_at: string | null
          due_date: string | null
          human_id: string | null
          id: string | null
          priority: Database["public"]["Enums"]["priority_lvl"] | null
          stage: Database["public"]["Enums"]["stage"] | null
          storage_location: string | null
          store: string | null
          title: string | null
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string | null
          due_date?: string | null
          human_id?: string | null
          id?: string | null
          priority?: Database["public"]["Enums"]["priority_lvl"] | null
          stage?: Database["public"]["Enums"]["stage"] | null
          storage_location?: string | null
          store?: string | null
          title?: string | null
        }
        Update: {
          assignee_id?: string | null
          created_at?: string | null
          due_date?: string | null
          human_id?: string | null
          id?: string | null
          priority?: Database["public"]["Enums"]["priority_lvl"] | null
          stage?: Database["public"]["Enums"]["stage"] | null
          storage_location?: string | null
          store?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      unassigned_view: {
        Row: {
          count: number | null
          stage: Database["public"]["Enums"]["stage"] | null
          store: string | null
        }
        Relationships: []
      }
      vw_complete_minimal: {
        Row: {
          created_at: string | null
          human_id: string | null
          id: string | null
          packing_complete_ts: string | null
          storage_location: string | null
          store: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          human_id?: string | null
          id?: string | null
          packing_complete_ts?: string | null
          storage_location?: string | null
          store?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          human_id?: string | null
          id?: string | null
          packing_complete_ts?: string | null
          storage_location?: string | null
          store?: string | null
          title?: string | null
        }
        Relationships: []
      }
      vw_queue_minimal: {
        Row: {
          assignee_id: string | null
          created_at: string | null
          due_date: string | null
          human_id: string | null
          id: string | null
          priority: Database["public"]["Enums"]["priority_lvl"] | null
          stage: Database["public"]["Enums"]["stage"] | null
          storage_location: string | null
          store: string | null
          title: string | null
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string | null
          due_date?: string | null
          human_id?: string | null
          id?: string | null
          priority?: Database["public"]["Enums"]["priority_lvl"] | null
          stage?: Database["public"]["Enums"]["stage"] | null
          storage_location?: string | null
          store?: string | null
          title?: string | null
        }
        Update: {
          assignee_id?: string | null
          created_at?: string | null
          due_date?: string | null
          human_id?: string | null
          id?: string | null
          priority?: Database["public"]["Enums"]["priority_lvl"] | null
          stage?: Database["public"]["Enums"]["stage"] | null
          storage_location?: string | null
          store?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_unassigned_counts: {
        Row: {
          count: number | null
          stage: Database["public"]["Enums"]["stage"] | null
          store: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _order_lock: { Args: { p_order_id: string }; Returns: undefined }
      add_participant:
        | {
            Args: { p_conversation_id: string; p_user_id: string }
            Returns: boolean
          }
        | {
            Args: { p_conversation_id: string; p_user_id: string }
            Returns: boolean
          }
      adjust_accessory_stock: {
        Args: {
          p_accessory_id: string
          p_change: number
          p_created_by?: string
          p_reason?: string
          p_reference?: string
        }
        Returns: Json
      }
      adjust_cake_topper_stock: {
        Args: {
          p_change: number
          p_created_by?: string
          p_reason: string
          p_reference?: string
          p_topper_id: string
        }
        Returns: Json
      }
      adjust_component_stock: {
        Args: {
          p_change: number
          p_component_id: string
          p_created_by?: string
          p_reason: string
          p_reference?: string
        }
        Returns: Json
      }
      adjust_staff_time: {
        Args: {
          p_new_end?: string
          p_new_start?: string
          p_note?: string
          p_shift_id: string
        }
        Returns: undefined
      }
      admin_delete_order: { Args: { p_order_id: string }; Returns: undefined }
      alpha_suffix: { Args: { p_idx: number }; Returns: string }
      app_can_access_store: { Args: { s: string }; Returns: boolean }
      app_is_service_role: { Args: never; Returns: boolean }
      app_role: { Args: never; Returns: string }
      assign_staff: {
        Args: { p_order_id: string; p_staff_id: string; p_store: string }
        Returns: boolean
      }
      assign_staff_bulk: {
        Args: { p_order_ids: string[]; p_staff_id: string; p_store: string }
        Returns: number
      }
      assign_staff_to_order: {
        Args: { p_order_id: string; p_staff_id: string }
        Returns: {
          assignee_id: string | null
          barcode: string | null
          covering_complete_ts: string | null
          created_at: string
          currency: string | null
          customer_name: string | null
          decorating_complete_ts: string | null
          delivery_date: string | null
          delivery_method: string | null
          due_date: string | null
          filling_complete_ts: string | null
          filling_start_ts: string | null
          flavour: string | null
          human_id: string | null
          id: string
          inventory_blocked: boolean
          item_qty: number | null
          notes: string | null
          order_json: Json | null
          order_number: string | null
          packing_complete_ts: string | null
          packing_start_ts: string | null
          priority: Database["public"]["Enums"]["priority_lvl"]
          product_title: string | null
          shopify_order_gid: string | null
          shopify_order_id: string | null
          shopify_order_number: number | null
          stage: Database["public"]["Enums"]["stage"]
          status_stage: string | null
          storage_location: string | null
          store: string
          title: string | null
          total_amount: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auth_email: { Args: never; Returns: string }
      cancel_order: {
        Args: { p_order_id: string; p_reason?: string; p_store: string }
        Returns: boolean
      }
      claim_inventory_sync_items: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          shopify_ids: Json
          status: string
          sync_action: string
        }[]
      }
      complete_covering: {
        Args: { p_notes?: string; p_order_id: string; p_store: string }
        Returns: boolean
      }
      complete_decorating: {
        Args: { p_notes?: string; p_order_id: string; p_store: string }
        Returns: boolean
      }
      complete_filling: {
        Args: { p_notes?: string; p_order_id: string; p_store: string }
        Returns: boolean
      }
      complete_packing: {
        Args: { p_notes?: string; p_order_id: string; p_store: string }
        Returns: boolean
      }
      create_conversation: {
        Args: { p_name?: string; p_participants: string[]; p_type?: string }
        Returns: string
      }
      create_conversation_text: {
        Args: { p_name?: string; p_participants: string[]; p_type?: string }
        Returns: string
      }
      create_manual_order: {
        Args: {
          p_customer_name: string
          p_due_date: string
          p_flavour: string
          p_image_url?: string
          p_notes?: string
          p_order_number: string
          p_product_title: string
          p_size: string
          p_store: string
          p_writing_on_cake?: string
        }
        Returns: string
      }
      current_user_name: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      deduct_for_order: {
        Args: {
          p_created_by?: string
          p_order_id: string
          p_product_title: string
          p_quantity?: number
          p_store: string
        }
        Returns: Json
      }
      delete_accessory_keyword: { Args: { p_id: string }; Returns: boolean }
      delete_bom: { Args: { p_id: string }; Returns: boolean }
      delete_component: { Args: { p_id: string }; Returns: boolean }
      end_break: { Args: { p_staff_id?: string }; Returns: undefined }
      end_shift: { Args: { p_staff_id?: string }; Returns: undefined }
      enqueue_order_split: {
        Args: {
          p_body: Json
          p_hook_id: string
          p_shop_domain: string
          p_topic: string
        }
        Returns: undefined
      }
      feature_rls_enabled: { Args: never; Returns: boolean }
      find_component_by_keyword: {
        Args: { p_keyword: string }
        Returns: {
          component_id: string
          component_name: string
          component_sku: string
          current_stock: number
          keyword_matched: string
          match_type: string
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
      get_accessories: {
        Args: { p_active_only?: boolean; p_category?: string }
        Returns: {
          category: string
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          is_low_stock: boolean
          is_out_of_stock: boolean
          min_stock: number
          name: string
          product_match: string
          sku: string
          updated_at: string
        }[]
      }
      get_accessories_needing_sync: {
        Args: never
        Returns: {
          current_stock: number
          id: string
          name: string
          product_match: string
        }[]
      }
      get_all_active_shifts: {
        Args: never
        Returns: {
          shift_id: string
          staff_id: string
          start_ts: string
          store: string
        }[]
      }
      get_bom_by_product: {
        Args: { p_product_title: string; p_store: string }
        Returns: {
          bom_id: string
          component_id: string
          component_name: string
          quantity_required: number
          stage: string
        }[]
      }
      get_boms: {
        Args: { p_active_only?: boolean; p_search?: string; p_store?: string }
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          items: Json
          product_title: string
          store: string
          updated_at: string
        }[]
      }
      get_cake_topper_stock_transactions: {
        Args: { p_limit?: number; p_topper_id?: string }
        Returns: {
          change_amount: number
          created_at: string
          created_by: string
          id: string
          item_id: string
          reason: string
          reference: string
          stock_after: number
          stock_before: number
          table_name: string
          topper_name: string
        }[]
      }
      get_cake_toppers: {
        Args: { p_active_only?: boolean }
        Returns: {
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          min_stock: number
          name_1: string
          name_2: string
          shopify_product_id_1: string
          shopify_product_id_2: string
          updated_at: string
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
      get_complete_minimal: {
        Args: { p_limit?: number; p_store?: string }
        Returns: {
          created_at: string | null
          human_id: string | null
          id: string | null
          packing_complete_ts: string | null
          storage_location: string | null
          store: string | null
          title: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "vw_complete_minimal"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_components: {
        Args: {
          p_active_only?: boolean
          p_category?: string
          p_search?: string
        }
        Returns: {
          category: string
          created_at: string
          current_stock: number
          description: string
          id: string
          is_active: boolean
          is_low_stock: boolean
          min_stock: number
          name: string
          sku: string
          unit: string
          updated_at: string
        }[]
      }
      get_conversation_participants: {
        Args: { p_conversation_id: string }
        Returns: {
          full_name: string
          is_online: boolean
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_conversations: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          created_by: string
          id: string
          last_message_at: string
          last_message_sender_id: string
          last_message_sender_name: string
          last_message_text: string
          name: string
          participant_count: number
          type: string
          unread_count: number
        }[]
      }
      get_current_shift: {
        Args: { p_staff_id?: string }
        Returns: {
          active_break_id: string
          break_start_ts: string
          end_ts: string
          shift_id: string
          staff_id: string
          start_ts: string
          store: string
        }[]
      }
      get_delivery_breakdown: {
        Args: { p_store: string; p_week_start?: string }
        Returns: {
          delivery_method: string
          order_count: number
          percentage: number
        }[]
      }
      get_department_performance: {
        Args: { p_days?: number }
        Returns: {
          color: string
          department: string
          efficiency: number
          members: number
          satisfaction: number
        }[]
      }
      get_due_date_settings: { Args: { p_store: string }; Returns: Json }
      get_flavours: { Args: { p_store: string }; Returns: string[] }
      get_low_stock_components: {
        Args: never
        Returns: {
          category: string
          current_stock: number
          id: string
          min_stock: number
          name: string
          shortage: number
          sku: string
        }[]
      }
      get_messages: {
        Args: { p_conversation_id: string; p_limit?: number }
        Returns: Json
      }
      get_messages_debug: {
        Args: { p_conversation_id: string }
        Returns: {
          debug_info: string
          is_participant: boolean
          message_count: number
          user_id: string
        }[]
      }
      get_messages_temp: {
        Args: { p_conversation_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          body: string
          created_at: string
          id: number
          is_own_message: boolean
          sender_id: string
          sender_name: string
        }[]
      }
      get_messages_temp_test: {
        Args: { p_conversation_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          body: string
          created_at: string
          id: string
          is_own_message: boolean
          sender_id: string
          sender_name: string
        }[]
      }
      get_monitor_density: { Args: { p_store: string }; Returns: string }
      get_order: {
        Args: { p_order_id: string; p_store: string }
        Returns: {
          accessories: Json
          assignee_id: string
          assignee_name: string
          cake_writing: string
          created_at: string
          currency: string
          customer_name: string
          delivery_method: string
          due_date: string
          flavour: string
          human_id: string
          id: string
          item_qty: number
          notes: string
          priority: Database["public"]["Enums"]["priority_level"]
          product_image: string
          product_title: string
          shopify_order_id: number
          shopify_order_number: number
          size: string
          stage: Database["public"]["Enums"]["stage_type"]
          storage: string
          store: string
          total_amount: number
          updated_at: string
        }[]
      }
      get_order_for_scan: {
        Args: { p_scan: string }
        Returns: Database["public"]["CompositeTypes"]["scanner_order_result"]
        SetofOptions: {
          from: "*"
          to: "scanner_order_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_order_v2: {
        Args: { p_order_id: string; p_store: string }
        Returns: {
          accessories: Json
          assignee_id: string
          assignee_name: string
          cake_writing: string
          created_at: string
          currency: string
          customer_name: string
          delivery_method: string
          due_date: string
          flavour: string
          human_id: string
          id: string
          item_qty: number
          notes: string
          priority: Database["public"]["Enums"]["priority_level"]
          product_image: string
          product_title: string
          shipping_address: Json
          shopify_order_id: number
          shopify_order_number: number
          size: string
          stage: Database["public"]["Enums"]["stage_type"]
          storage: string
          store: string
          total_amount: number
          updated_at: string
        }[]
      }
      get_printing_settings: { Args: { p_store: string }; Returns: Json }
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
          cancelled_at: string
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
      get_queue_minimal: {
        Args: { p_limit?: number; p_offset?: number; p_store?: string }
        Returns: {
          assignee_id: string | null
          created_at: string | null
          due_date: string | null
          human_id: string | null
          id: string | null
          priority: Database["public"]["Enums"]["priority_lvl"] | null
          stage: Database["public"]["Enums"]["stage"] | null
          storage_location: string | null
          store: string | null
          title: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "vw_queue_minimal"
          isOneToOne: false
          isSetofReturn: true
        }
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
      get_revenue_by_day: {
        Args: { p_end_date?: string; p_start_date?: string; p_store: string }
        Returns: {
          day: string
          orders: number
          revenue: number
        }[]
      }
      get_setting: { Args: { p_key: string; p_store: string }; Returns: Json }
      get_settings: {
        Args: { p_store: string }
        Returns: {
          created_at: string
          key: string
          store: string
          value: Json
        }[]
      }
      get_staff: {
        Args: never
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_staff_attendance_rate: {
        Args: { p_days?: number }
        Returns: {
          attendance_rate: number
          staff_with_shifts: number
          total_staff: number
        }[]
      }
      get_staff_avg_productivity: {
        Args: { p_days?: number }
        Returns: {
          avg_productivity: number
          avg_time_per_order_minutes: number
          total_orders_completed: number
        }[]
      }
      get_staff_list: {
        Args: { p_is_active?: boolean; p_role?: string }
        Returns: {
          approved: boolean
          created_at: string
          email: string
          full_name: string
          hourly_rate: number
          is_active: boolean
          phone: string
          role: string
          store: string
          updated_at: string
          user_id: string
        }[]
      }
      get_staff_me: {
        Args: never
        Returns: {
          email: string
          full_name: string
          is_active: boolean
          phone: string
          role: string
          store: string
          user_id: string
        }[]
      }
      get_staff_member: {
        Args: { p_user_id: string }
        Returns: {
          email: string
          full_name: string
          is_active: boolean
          phone: string
          role: string
          store: string
          user_id: string
        }[]
      }
      get_staff_stage_performance: {
        Args: { p_days?: number }
        Returns: {
          covering_count: number
          decorating_count: number
          filling_count: number
          packing_count: number
          staff_id: string
          staff_name: string
          total_count: number
        }[]
      }
      get_staff_stats: {
        Args: never
        Returns: {
          assigned_orders: number
          user_id: string
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
      get_staff_with_shift_status: {
        Args: never
        Returns: {
          email: string
          full_name: string
          is_active: boolean
          phone: string
          role: string
          shift_start: string
          shift_status: string
          shift_store: string
          store: string
          user_id: string
        }[]
      }
      get_stock_transactions: {
        Args: { p_item_id?: string; p_limit?: number; p_table_name?: string }
        Returns: {
          change_amount: number
          created_at: string
          created_by: string
          id: string
          item_id: string
          item_name: string
          reason: string
          reference: string
          stock_after: number
          stock_before: number
          table_name: string
        }[]
      }
      get_storage_locations: { Args: { p_store: string }; Returns: string[] }
      get_store_analytics: {
        Args: { p_end_date?: string; p_start_date?: string; p_store: string }
        Returns: {
          avg_order_value: number
          pending_today: number
          total_orders: number
          total_revenue: number
        }[]
      }
      get_store_production_efficiency: {
        Args: { p_days?: number; p_store: string }
        Returns: {
          efficiency: number
          output: number
          station: string
          target: number
        }[]
      }
      get_sync_log: {
        Args: { p_limit?: number; p_store?: string }
        Returns: {
          completed_at: string
          error_message: string
          errors: number
          id: string
          orders_imported: number
          orders_skipped: number
          products_imported: number
          products_skipped: number
          started_at: string
          status: string
          store: string
          sync_type: string
        }[]
      }
      get_top_products: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_start_date?: string
          p_store: string
        }
        Returns: {
          order_count: number
          product_title: string
          total_revenue: number
        }[]
      }
      get_unassigned_counts: {
        Args: { p_store: string }
        Returns: {
          count: number
          stage: string
        }[]
      }
      get_unread_count: { Args: never; Returns: number }
      get_weekly_forecast: {
        Args: { p_store: string; p_week_start?: string }
        Returns: {
          completed_orders: number
          day_date: string
          day_of_week: number
          pending_orders: number
          total_orders: number
        }[]
      }
      handle_print_barcode: {
        Args: { p_barcode: string; p_order_id: string }
        Returns: {
          assignee_id: string | null
          barcode: string | null
          covering_complete_ts: string | null
          created_at: string
          currency: string | null
          customer_name: string | null
          decorating_complete_ts: string | null
          delivery_date: string | null
          delivery_method: string | null
          due_date: string | null
          filling_complete_ts: string | null
          filling_start_ts: string | null
          flavour: string | null
          human_id: string | null
          id: string
          inventory_blocked: boolean
          item_qty: number | null
          notes: string | null
          order_json: Json | null
          order_number: string | null
          packing_complete_ts: string | null
          packing_start_ts: string | null
          priority: Database["public"]["Enums"]["priority_lvl"]
          product_title: string | null
          shopify_order_gid: string | null
          shopify_order_id: string | null
          shopify_order_number: number | null
          stage: Database["public"]["Enums"]["stage"]
          status_stage: string | null
          storage_location: string | null
          store: string
          title: string | null
          total_amount: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ingest_order:
        | {
            Args: { normalized?: Json; p_shop_domain: string; payload?: Json }
            Returns: undefined
          }
        | { Args: { normalized?: Json; payload?: Json }; Returns: undefined }
      is_cake_item: { Args: { p_item: Json }; Returns: boolean }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      mark_messages_read: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      mark_order_complete: {
        Args: { p_order_id: string; p_store: string }
        Returns: boolean
      }
      move_to_filling_with_assignment: {
        Args: { p_order_id: string; p_staff_id: string }
        Returns: {
          assignee_id: string | null
          barcode: string | null
          covering_complete_ts: string | null
          created_at: string
          currency: string | null
          customer_name: string | null
          decorating_complete_ts: string | null
          delivery_date: string | null
          delivery_method: string | null
          due_date: string | null
          filling_complete_ts: string | null
          filling_start_ts: string | null
          flavour: string | null
          human_id: string | null
          id: string
          inventory_blocked: boolean
          item_qty: number | null
          notes: string | null
          order_json: Json | null
          order_number: string | null
          packing_complete_ts: string | null
          packing_start_ts: string | null
          priority: Database["public"]["Enums"]["priority_lvl"]
          product_title: string | null
          shopify_order_gid: string | null
          shopify_order_id: string | null
          shopify_order_number: number | null
          stage: Database["public"]["Enums"]["stage"]
          status_stage: string | null
          storage_location: string | null
          store: string
          title: string | null
          total_amount: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      print_barcode: {
        Args: { p_order_id: string; p_store: string }
        Returns: Json
      }
      process_kitchen_task_create: {
        Args: { p_limit?: number; p_lock_secs?: number }
        Returns: number
      }
      process_webhook_order_split: {
        Args: { p_limit?: number; p_lock_secs?: number }
        Returns: number
      }
      qc_return_to_decorating: {
        Args: { p_notes?: string; p_order_id: string; p_store: string }
        Returns: boolean
      }
      remove_participant:
        | {
            Args: { p_conversation_id: string; p_user_id: string }
            Returns: boolean
          }
        | {
            Args: { p_conversation_id: string; p_user_id: string }
            Returns: boolean
          }
      rls_bypass: { Args: never; Returns: boolean }
      safe_audit_log: {
        Args: { p_action: string; p_meta: Json; p_source: string }
        Returns: undefined
      }
      save_bom_items: {
        Args: { p_bom_id: string; p_items: Json }
        Returns: number
      }
      send_message: {
        Args: { p_content: string; p_conversation_id: string }
        Returns: number
      }
      set_due_date_settings: {
        Args: { p_settings: Json; p_store: string }
        Returns: boolean
      }
      set_flavours: {
        Args: { p_flavours: string[]; p_store: string }
        Returns: boolean
      }
      set_monitor_density: {
        Args: { p_density: string; p_store: string }
        Returns: boolean
      }
      set_printing_settings: {
        Args: { p_settings: Json; p_store: string }
        Returns: boolean
      }
      set_setting: {
        Args: { p_key: string; p_store: string; p_value: Json }
        Returns: boolean
      }
      set_storage: {
        Args: { p_order_id: string; p_storage: string; p_store: string }
        Returns: undefined
      }
      set_storage_locations: {
        Args: { p_locations: string[]; p_store: string }
        Returns: boolean
      }
      settings_get_bool: {
        Args: { default_value: boolean; k: string; ns: string }
        Returns: boolean
      }
      start_break: { Args: { p_staff_id?: string }; Returns: string }
      start_covering: {
        Args: { p_order_id: string; p_store: string }
        Returns: Json
      }
      start_decorating: {
        Args: { p_order_id: string; p_store: string }
        Returns: Json
      }
      start_packing: {
        Args: { p_order_id: string }
        Returns: {
          assignee_id: string | null
          barcode: string | null
          covering_complete_ts: string | null
          created_at: string
          currency: string | null
          customer_name: string | null
          decorating_complete_ts: string | null
          delivery_date: string | null
          delivery_method: string | null
          due_date: string | null
          filling_complete_ts: string | null
          filling_start_ts: string | null
          flavour: string | null
          human_id: string | null
          id: string
          inventory_blocked: boolean
          item_qty: number | null
          notes: string | null
          order_json: Json | null
          order_number: string | null
          packing_complete_ts: string | null
          packing_start_ts: string | null
          priority: Database["public"]["Enums"]["priority_lvl"]
          product_title: string | null
          shopify_order_gid: string | null
          shopify_order_id: string | null
          shopify_order_number: number | null
          stage: Database["public"]["Enums"]["stage"]
          status_stage: string | null
          storage_location: string | null
          store: string
          title: string | null
          total_amount: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_shift: {
        Args: { p_staff_id?: string; p_store: string }
        Returns: string
      }
      sync_shopify_orders: { Args: { p_store: string }; Returns: Json }
      test_admin_token: {
        Args: { p_store: string; p_token: string }
        Returns: Json
      }
      test_auth: {
        Args: never
        Returns: {
          user_email: string
          user_id: string
        }[]
      }
      test_rpc_call: { Args: never; Returns: string }
      update_order_core: {
        Args: {
          p_customer_name?: string
          p_delivery_method?: string
          p_due_date?: string
          p_flavour?: string
          p_item_qty?: number
          p_notes?: string
          p_order_id: string
          p_product_title?: string
          p_size?: string
          p_storage?: string
          p_store: string
        }
        Returns: boolean
      }
      update_staff_member: {
        Args: {
          p_approved?: boolean
          p_full_name?: string
          p_hourly_rate?: number
          p_is_active?: boolean
          p_phone?: string
          p_role?: string
          p_user_id: string
        }
        Returns: undefined
      }
      upload_order_photo: {
        Args: {
          p_order_id: string
          p_qc_comments?: string
          p_qc_issue?: string
          p_qc_status?: string
          p_stage?: string
          p_store: string
          p_url: string
        }
        Returns: string
      }
      upsert_accessory: {
        Args: {
          p_category?: string
          p_id?: string
          p_is_active?: boolean
          p_min_stock?: number
          p_name?: string
          p_product_match?: string
          p_sku?: string
        }
        Returns: string
      }
      upsert_bom: {
        Args: {
          p_description?: string
          p_id?: string
          p_is_active?: boolean
          p_product_title?: string
          p_shopify_product_id?: string
          p_store?: string
        }
        Returns: string
      }
      upsert_cake_topper: {
        Args: {
          p_id?: string
          p_is_active?: boolean
          p_min_stock?: number
          p_name_1?: string
          p_name_2?: string
          p_shopify_product_id_1?: string
          p_shopify_product_id_2?: string
        }
        Returns: string
      }
      upsert_component: {
        Args: {
          p_category?: string
          p_description?: string
          p_id?: string
          p_is_active?: boolean
          p_min_stock?: number
          p_name?: string
          p_sku?: string
          p_unit?: string
        }
        Returns: string
      }
    }
    Enums: {
      priority_level: "High" | "Medium" | "Low"
      priority_lvl: "High" | "Medium" | "Low"
      stage:
        | "Filling_pending"
        | "Filling_in_progress"
        | "Covering_pending"
        | "Covering_in_progress"
        | "Decorating_pending"
        | "Decorating_in_progress"
        | "Packing_in_progress"
        | "Complete"
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
      priority_level: ["High", "Medium", "Low"],
      priority_lvl: ["High", "Medium", "Low"],
      stage: [
        "Filling_pending",
        "Filling_in_progress",
        "Covering_pending",
        "Covering_in_progress",
        "Decorating_pending",
        "Decorating_in_progress",
        "Packing_in_progress",
        "Complete",
      ],
      stage_type: ["Filling", "Covering", "Decorating", "Packing", "Complete"],
    },
  },
} as const

// Custom type aliases for RPC return types
export type GetQueueRow = Database['public']['Functions']['get_queue']['Returns'][number];
export type GetQueueStatsRow = Database['public']['Functions']['get_queue_stats']['Returns'][number];
export type GetStaffTimesRow = Database['public']['Functions']['get_staff_times']['Returns'][number];
export type GetStaffTimesDetailRow = Database['public']['Functions']['get_staff_times_detail']['Returns'][number];
export type GetCompleteRow = Database['public']['Functions']['get_complete']['Returns'][number];
export type FindOrderRow = Database['public']['Functions']['find_order']['Returns'][number];
export type GetSettingsRow = Database['public']['Functions']['get_settings']['Returns'][number];
