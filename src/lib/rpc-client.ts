/**
 * Supabase RPC Client
 * Complete type-safe wrapper for all RPC functions
 * Auto-generated from Supabase schema - v0.3.0-beta
 */

import { getSupabase } from './supabase';
import type { Stage, Store, Priority } from '../types/db';
import { createError, handleError, logError, ErrorCode } from './error-handler';

// =============================================
// MESSAGING TYPES
// =============================================

import type { ServerMessage } from '../types/messages';

export interface Message {
  id: number;
  body: string;
  authorId: string;
  createdAt: string;
  conversationId: string;
  is_own_message: boolean;
}

export interface Conversation {
  id: string;
  name: string | null;
  type: 'direct' | 'group' | 'broadcast';
  created_by: string;
  created_at: string;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  last_message_sender_name: string | null;
  unread_count: number;
  participant_count: number;
}

export interface ConversationParticipant {
  user_id: string;
  full_name: string;
  role: string;
  is_online: boolean;
  joined_at: string;
}

// =============================================
// ERROR HANDLING WRAPPER
// =============================================

/**
 * Check if error is related to JWT/auth token expiration
 */
function isJWTError(error: any): boolean {
  if (!error) return false;
  
  const errorString = JSON.stringify(error).toLowerCase();
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toString() || '';
  
  return (
    code === '401' ||
    code === 'PGRST301' ||
    message.includes('jwt') ||
    message.includes('expired') ||
    message.includes('invalid claim') ||
    message.includes('token') ||
    errorString.includes('jwt') ||
    errorString.includes('expired')
  );
}

/**
 * Wraps RPC calls with standardized error handling and JWT retry logic
 */
async function withErrorHandling<T>(
  rpcCall: () => Promise<T>,
  context: { operation: string; rpcName: string; params?: any; retryCount?: number }
): Promise<T> {
  const startTime = Date.now();
  const maxRetries = 1; // Retry once on JWT errors
  const retryCount = context.retryCount || 0;
  
  try {
    const result = await rpcCall();
    const duration = Date.now() - startTime;
    
    // Log successful operations in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`RPC ${context.rpcName} completed in ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Check for JWT/auth errors first
    if (isJWTError(error) && retryCount < maxRetries) {
      console.warn(`🔄 JWT error detected, retrying ${context.rpcName}... (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait a bit before retry to allow token refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Retry the RPC call
      return withErrorHandling(rpcCall, { ...context, retryCount: retryCount + 1 });
    }
    
    // If JWT error and out of retries, create specific auth error
    if (isJWTError(error)) {
      const appError = createError(
        ErrorCode.AUTH003,
        'Your session has expired. Please refresh the page or log in again.',
        { rpcName: context.rpcName, params: context.params },
        { operation: context.operation, duration, retries: retryCount }
      );
      
      logError(appError, {
        operation: context.operation,
        rpcName: context.rpcName,
        params: context.params,
        duration
      });
      
      throw appError;
    }
    
    // Handle different types of errors
    let appError;
    
    if (error && typeof error === 'object' && 'code' in error) {
      // Supabase error
      const supabaseError = error as any;
      
      switch (supabaseError.code) {
        case 'PGRST301': // Function not found
          appError = createError(
            ErrorCode.SYS002,
            `RPC function '${context.rpcName}' not found`,
            { rpcName: context.rpcName, params: context.params },
            { operation: context.operation, duration }
          );
          break;
          
        case 'PGRST116': // Insufficient privileges
          appError = createError(
            ErrorCode.AUTH004,
            'Insufficient permissions to perform this operation',
            { rpcName: context.rpcName, params: context.params },
            { operation: context.operation, duration }
          );
          break;
          
        case 'PGRST204': // Row not found
          appError = createError(
            ErrorCode.ORD001,
            'Record not found',
            { rpcName: context.rpcName, params: context.params },
            { operation: context.operation, duration }
          );
          break;
          
        default:
          appError = createError(
            ErrorCode.SYS002,
            supabaseError.message || 'Database operation failed',
            { rpcName: context.rpcName, params: context.params, originalError: supabaseError },
            { operation: context.operation, duration }
          );
      }
    } else {
      // Generic error
      appError = handleError(error, {
        operation: context.operation,
        rpcName: context.rpcName,
        params: context.params,
        duration
      });
    }
    
    // Log the error
    logError(appError, {
      operation: context.operation,
      rpcName: context.rpcName,
      params: context.params,
      duration
    });
    
    throw appError;
  }
}

// =============================================
// STAFF MANAGEMENT
// =============================================

export interface StaffMember {
  user_id: string;
  full_name: string;
  role: 'Admin' | 'Supervisor' | 'Staff';
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Component {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  cost_per_unit: number | null;
  supplier: string | null;
  supplier_sku: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getStaffList(role?: string | null, isActive: boolean = true) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_list', {
    p_role: role || null,
    p_is_active: isActive,
  });
  if (error) throw error;
  return (data || []) as StaffMember[];
}

// =============================================
// QUEUE & ORDER MANAGEMENT
// =============================================

export interface GetQueueParams {
  store?: Store | null;
  stage?: Stage | null;
  assignee_id?: string | null;
  storage?: string | null;
  priority?: Priority | null;
  search?: string | null;
  offset?: number;
  limit?: number;
  sort_by?: 'priority' | 'due_date' | 'created_at' | 'customer_name' | 'product_title';
  sort_order?: 'ASC' | 'DESC';
}

export async function getQueue(params: GetQueueParams = {}) {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('get_queue', {
        p_store: params.store || null,
        p_stage: params.stage || null,
        p_assignee_id: params.assignee_id || null,
        p_storage: params.storage || null,
        p_priority: params.priority || null,
        p_search: params.search || null,
        p_offset: params.offset || 0,
        p_limit: params.limit || 50,
        p_sort_by: params.sort_by || 'priority',
        p_sort_order: params.sort_order || 'DESC',
      });
      if (error) throw error;
      return data || [];
    },
    {
      operation: 'getQueue',
      rpcName: 'get_queue',
      params
    }
  );
}

export async function getQueueStats(store?: Store | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_queue_stats', {
    p_store: store || null,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function getUnassignedCounts(store?: Store | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_unassigned_counts', {
    p_store: store || null,
  });
  if (error) throw error;
  return data || [];
}

export async function getOrder(orderId: string, store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_order', {
    p_order_id: orderId,
    p_store: store,
  });
  if (error) throw error;
  return data?.[0] || null;
}

// =============================================
// ORDER OPERATIONS
// =============================================

export async function assignStaff(orderId: string, store: Store, staffId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('assign_staff', {
    p_order_id: orderId,
    p_store: store,
    p_staff_id: staffId,
  });
  if (error) throw error;
  return data;
}

export async function unassignStaff(orderId: string, store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('unassign_staff', {
    p_order_id: orderId,
    p_store: store,
  });
  if (error) throw error;
  return data;
}

export async function setStorage(orderId: string, store: Store, storageLocation: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_storage', {
    p_order_id: orderId,
    p_store: store,
    p_storage_location: storageLocation,
  });
  if (error) throw error;
  return data;
}

export async function updateOrderNotes(orderId: string, store: Store, notes: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('update_order_notes', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes,
  });
  if (error) throw error;
  return data;
}

export async function updateOrderPriority(orderId: string, store: Store, priority: Priority) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('update_order_priority', {
    p_order_id: orderId,
    p_store: store,
    p_priority: priority,
  });
  if (error) throw error;
  return data;
}

export async function updateOrderDueDate(orderId: string, store: Store, dueDate: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('update_order_due_date', {
    p_order_id: orderId,
    p_store: store,
    p_due_date: dueDate,
  });
  if (error) throw error;
  return data;
}

export async function updateOrderCore(orderId: string, store: Store, updates: {
  customer_name?: string;
  product_title?: string;
  flavour?: string;
  notes?: string;
  due_date?: string;
  delivery_method?: string;
  size?: string;
  item_qty?: number;
  storage?: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('update_order_core', {
    p_order_id: orderId,
    p_store: store,
    p_customer_name: updates.customer_name || null,
    p_product_title: updates.product_title || null,
    p_flavour: updates.flavour || null,
    p_notes: updates.notes || null,
    p_due_date: updates.due_date || null,
    p_delivery_method: updates.delivery_method || null,
    p_size: updates.size || null,
    p_item_qty: updates.item_qty || null,
    p_storage: updates.storage || null,
  });
  if (error) throw error;
  return data;
}

// =============================================
// SCANNER & STAGE MANAGEMENT
// =============================================

export async function handlePrintBarcode(barcode: string, orderId: string, performedBy?: string, context?: Record<string, any>) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('handle_print_barcode', {
    p_barcode: barcode,
    p_order_id: orderId,
    p_performed_by: performedBy || null,
    p_context: context || {}
  });
  if (error) throw error;
  return data;
}

export async function getOrderForScan(scan: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_order_for_scan', {
    p_scan: scan,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function completeFilling(orderId: string, store: string, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_filling', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function completeCovering(orderId: string, store: string, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_covering', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function completeDecorating(orderId: string, store: string, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_decorating', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function startPacking(orderId: string, performedBy?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('start_packing', {
    p_order_id: orderId,
    p_performed_by: performedBy || null,
  });
  if (error) throw error;
  return data;
}

export async function completePacking(orderId: string, store: string, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_packing', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function qcReturnToDecorating(orderId: string, store: string, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('qc_return_to_decorating', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

// =============================================
// STAFF MANAGEMENT
// =============================================

export async function getStaffMe() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_me');
  if (error) throw error;
  return data?.[0] || null;
}

export async function startShift(store: 'bannos' | 'flourlane', staffId?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('start_shift', {
    p_store: store,
    p_staff_id: staffId || null,
  });
  if (error) throw error;
  return data;
}

export async function endShift(staffId?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('end_shift', {
    p_staff_id: staffId || null,
  });
  if (error) throw error;
  return data;
}

export async function startBreak(staffId?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('start_break', {
    p_staff_id: staffId || null,
  });
  if (error) throw error;
  return data;
}

export async function endBreak(staffId?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('end_break', {
    p_staff_id: staffId || null,
  });
  if (error) throw error;
  return data;
}

export async function getCurrentShift(staffId?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_current_shift', {
    p_staff_id: staffId || null,
  });
  if (error) throw error;
  return data?.[0] || null;
}

// =============================================
// INVENTORY MANAGEMENT
// =============================================

export async function getComponents(params: {
  category?: string;
  is_active?: boolean;
  low_stock_only?: boolean;
  search?: string;
  limit?: number;
} = {}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_components', {
    p_category: params.category || null,
    p_is_active: params.is_active ?? true,
    p_low_stock_only: params.low_stock_only || false,
    p_search: params.search || null,
    p_limit: params.limit || 100,
  });
  if (error) throw error;
  return data || [];
}

export async function getLowStockComponents() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_low_stock_components');
  if (error) throw error;
  return data || [];
}

export async function getInventoryValue() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_inventory_value');
  if (error) throw error;
  return data?.[0] || null;
}

export async function updateComponentStock(params: {
  component_id: string;
  delta: number;
  reason: string;
  order_id?: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('update_component_stock', {
    p_component_id: params.component_id,
    p_delta: params.delta,
    p_reason: params.reason,
    p_order_id: params.order_id || null,
  });
  if (error) throw error;
  return data;
}

export async function upsertComponent(params: {
  id?: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  cost_per_unit?: number;
  supplier?: string;
  supplier_sku?: string;
  is_active?: boolean;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('upsert_component', {
    p_sku: params.sku,
    p_name: params.name,
    p_id: params.id || null,
    p_description: params.description || null,
    p_category: params.category || null,
    p_unit: params.unit || 'each',
    p_current_stock: params.current_stock || 0,
    p_min_stock: params.min_stock || 0,
    p_max_stock: params.max_stock || null,
    p_cost_per_unit: params.cost_per_unit || null,
    p_supplier: params.supplier || null,
    p_supplier_sku: params.supplier_sku || null,
    p_is_active: params.is_active !== false,
  });
  if (error) throw error;
  return data as string; // Returns the component ID
}

// =============================================
// BOM MANAGEMENT
// =============================================

export interface BOMItem {
  id: string;
  bom_id: string;
  component_id: string;
  component_name: string;
  component_sku: string;
  quantity_per_unit: number;
  stage?: 'Filling' | 'Decorating' | 'Packing';
  is_optional: boolean;
  created_at: string;
  updated_at: string;
}

export interface BOM {
  id: string;
  product_title: string;
  store: Store;
  description?: string;
  shopify_product_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items: BOMItem[];
}

export async function getBoms(store?: Store | null, activeOnly: boolean = true, search?: string | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_boms', {
    p_store: store || null,
    p_is_active: activeOnly,
    p_search: search || null,
  });
  if (error) throw error;
  return (data || []) as BOM[];
}

export async function upsertBom(params: {
  product_title: string;
  store: Store;
  bom_id?: string;
  description?: string;
  shopify_product_id?: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('upsert_bom', {
    p_product_title: params.product_title,
    p_store: params.store,
    p_bom_id: params.bom_id || null,
    p_description: params.description || null,
    p_shopify_product_id: params.shopify_product_id || null,
  });
  if (error) throw error;
  return data as string; // Returns the BOM ID
}

// =============================================
// ACCESSORY KEYWORDS MANAGEMENT
// =============================================

export interface AccessoryKeyword {
  id: string;
  keyword: string;
  component_id: string;
  component_name: string;
  component_sku: string;
  priority: number;
  match_type: 'contains' | 'exact' | 'starts_with' | 'ends_with';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getAccessoryKeywords(search?: string | null, activeOnly: boolean = true) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_accessory_keywords', {
    p_search: search || null,
    p_is_active: activeOnly,
  });
  if (error) throw error;
  return (data || []) as AccessoryKeyword[];
}

export async function upsertAccessoryKeyword(params: {
  keyword: string;
  component_id: string;
  id?: string;
  priority?: number;
  match_type?: 'contains' | 'exact' | 'starts_with' | 'ends_with';
  is_active?: boolean;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('upsert_accessory_keyword', {
    p_keyword: params.keyword,
    p_component_id: params.component_id,
    p_id: params.id || null,
    p_priority: params.priority || 0,
    p_match_type: params.match_type || 'contains',
    p_is_active: params.is_active !== false,
  });
  if (error) throw error;
  return data as string; // Returns the keyword ID
}

// =============================================
// PRODUCT REQUIREMENTS MANAGEMENT
// =============================================

export interface ProductRequirement {
  id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  product_title: string;
  component_id: string;
  component_name: string;
  component_sku: string;
  quantity_per_unit: number;
  is_optional: boolean;
  auto_deduct: boolean;
  created_at: string;
  updated_at: string;
}

export async function getProductRequirements(shopifyProductId?: string | null, search?: string | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_product_requirements', {
    p_shopify_product_id: shopifyProductId || null,
    p_search: search || null,
  });
  if (error) throw error;
  return (data || []) as ProductRequirement[];
}

export async function upsertProductRequirement(params: {
  shopify_product_id: string;
  shopify_variant_id: string;
  product_title: string;
  component_id: string;
  quantity_per_unit: number;
  id?: string;
  is_optional?: boolean;
  auto_deduct?: boolean;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('upsert_product_requirement', {
    p_shopify_product_id: params.shopify_product_id,
    p_shopify_variant_id: params.shopify_variant_id,
    p_product_title: params.product_title,
    p_component_id: params.component_id,
    p_quantity_per_unit: params.quantity_per_unit,
    p_id: params.id || null,
    p_is_optional: params.is_optional || false,
    p_auto_deduct: params.auto_deduct !== false,
  });
  if (error) throw error;
  return data as string; // Returns the requirement ID
}

// =============================================
// STOCK TRANSACTIONS MANAGEMENT
// =============================================

export interface StockTransaction {
  id: string;
  component_id: string;
  component_name: string;
  component_sku: string;
  delta: number;
  reason: string;
  order_id?: string;
  performed_by?: string;
  performer_name?: string;
  created_at: string;
  updated_at: string;
}

export async function getStockTransactions(componentId?: string | null, orderId?: string | null, transactionType?: string | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_stock_transactions', {
    p_component_id: componentId || null,
    p_order_id: orderId || null,
    p_transaction_type: transactionType || null,
  });
  if (error) throw error;
  return (data || []) as StockTransaction[];
}

export async function restockOrder(orderId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('restock_order', {
    p_order_id: orderId,
  });
  if (error) throw error;
  return data;
}

// =============================================
// SETTINGS MANAGEMENT
// =============================================

export async function getSettings(store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_settings', {
    p_store: store
  });
  if (error) throw error;
  return data;
}

export async function getSetting(store: Store, key: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_setting', {
    p_store: store,
    p_key: key
  });
  if (error) throw error;
  return data;
}

export async function setSetting(store: Store, key: string, value: any) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_setting', {
    p_store: store,
    p_key: key,
    p_value: value
  });
  if (error) throw error;
  return data;
}

export async function getPrintingSettings(store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_printing_settings', {
    p_store: store
  });
  if (error) throw error;
  return data;
}

export async function setPrintingSettings(store: Store, settings: any) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_printing_settings', {
    p_store: store,
    p_settings: settings
  });
  if (error) throw error;
  return data;
}

export async function getMonitorDensity(store: Store) {
  console.log('getMonitorDensity called for store:', store);
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_monitor_density', {
    p_store: store
  });
  if (error) {
    console.error('getMonitorDensity error:', error);
    throw error;
  }
  console.log('getMonitorDensity raw data:', data);
  return data;
}

export async function setMonitorDensity(store: Store, density: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_monitor_density', {
    p_store: store,
    p_density: density
  });
  if (error) throw error;
  return data;
}

export async function getFlavours(store: Store): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_flavours', {
    p_store: store,
  });
  if (error) throw error;
  
  // Handle different return formats
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
    return data.data;
  } else if (data && typeof data === 'object' && Array.isArray(data.flavours)) {
    return data.flavours;
  } else {
    console.warn('Unexpected flavours data format:', data);
    return [];
  }
}

export async function getStorageLocations(store: Store): Promise<string[]> {
  console.log('getStorageLocations called for store:', store);
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_storage_locations', {
    p_store: store,
  });
  if (error) {
    console.error('getStorageLocations error:', error);
    throw error;
  }
  
  console.log('getStorageLocations raw data:', data);
  
  // Handle different return formats
  if (Array.isArray(data)) {
    console.log('getStorageLocations returning array:', data);
    return data;
  } else if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
    console.log('getStorageLocations returning data.data:', data.data);
    return data.data;
  } else if (data && typeof data === 'object' && Array.isArray(data.locations)) {
    console.log('getStorageLocations returning data.locations:', data.locations);
    return data.locations;
  } else {
    console.warn('Unexpected storage locations data format:', data);
    return [];
  }
}

export async function setFlavours(store: Store, flavours: string[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_flavours', {
    p_store: store,
    p_flavours: flavours,
  });
  if (error) throw error;
  return data;
}

export async function setStorageLocations(store: Store, locations: string[]) {
  console.log('setStorageLocations called with:', { store, locations });
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_storage_locations', {
    p_store: store,
    p_locations: locations,
  });
  if (error) {
    console.error('setStorageLocations error:', error);
    throw error;
  }
  console.log('setStorageLocations result:', data);
  return data;
}

// =============================================
// DUE DATE MANAGEMENT
// =============================================

export interface DueDateSettings {
  defaultDue: string;
  allowedDays: boolean[];
  blackoutDates: string[];
}

export async function getDueDateSettings(store: Store): Promise<DueDateSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_due_date_settings', {
    p_store: store,
  });
  if (error) throw error;
  return data as DueDateSettings;
}

export async function setDueDateSettings(store: Store, settings: DueDateSettings) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_due_date_settings', {
    p_store: store,
    p_settings: settings,
  });
  if (error) throw error;
  return data;
}

// =============================================
// COMPLETE ORDERS
// =============================================

export async function getComplete(params: {
  store?: Store | null;
  start_date?: string | null;
  end_date?: string | null;
  search?: string | null;
  offset?: number;
  limit?: number;
  sort_by?: 'completed_at' | 'due_date' | 'customer_name' | 'product_title';
  sort_order?: 'ASC' | 'DESC';
} = {}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_complete', {
    p_store: params.store || null,
    p_start_date: params.start_date || null,
    p_end_date: params.end_date || null,
    p_search: params.search || null,
    p_offset: params.offset || 0,
    p_limit: params.limit || 50,
    p_sort_by: params.sort_by || 'completed_at',
    p_sort_order: params.sort_order || 'DESC',
  });
  if (error) throw error;
  return data || [];
}

// =============================================
// UNIVERSAL ORDER SEARCH (ALL STAGES)
// =============================================

export async function findOrder(search: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('find_order', {
    p_search: search,
  });
  if (error) throw error;
  return data || [];
}

// =============================================
// QC PHOTOS
// =============================================

export async function uploadOrderPhoto(
  orderId: string,
  store: Store,
  url: string,
  stage: string = 'Packing',
  qcStatus: string = 'ok',
  qcIssue?: string,
  qcComments?: string
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('upload_order_photo', {
    p_order_id: orderId,
    p_store: store,
    p_url: url,
    p_stage: stage,
    p_qc_status: qcStatus,
    p_qc_issue: qcIssue || null,
    p_qc_comments: qcComments || null,
  });
  if (error) throw error;
  return data; // Returns photo UUID
}

export async function getOrderPhotos(orderId: string, store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_order_photos', {
    p_order_id: orderId,
    p_store: store,
  });
  if (error) throw error;
  return data || [];
}

export async function getQCReviewQueue(store?: Store, qcStatus?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_qc_review_queue', {
    p_store: store || null,
    p_qc_status: qcStatus || null,
  });
  if (error) throw error;
  return data || [];
}

// =============================================
// TIME & PAYROLL
// =============================================

export async function getStaffTimes(from: string, to: string, staffId?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_times', {
    p_from: from,
    p_to: to,
    p_staff_id: staffId || null,
  });
  if (error) throw error;
  return data || [];
}

export async function getStaffTimesDetail(staffId: string, from: string, to: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_times_detail', {
    p_staff_id: staffId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return data || [];
}

export async function adjustStaffTime(
  shiftId: string,
  newStart?: string,
  newEnd?: string,
  note?: string
) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('adjust_staff_time', {
    p_shift_id: shiftId,
    p_new_start: newStart || null,
    p_new_end: newEnd || null,
    p_note: note || null,
  });
  if (error) throw error;
}

// =============================================
// BULK OPERATIONS
// =============================================

export async function bulkAssign(store: Store, orderIds: string[], staffId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('bulk_assign', {
    p_store: store,
    p_order_ids: orderIds,
    p_staff_id: staffId,
  });
  if (error) throw error;
  return data;
}

export async function cancelOrder(orderId: string, store: Store, reason?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('cancel_order', {
    p_order_id: orderId,
    p_store: store,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
}

// =============================================
// MESSAGING
// =============================================

export async function createConversation(
  participants: string[],
  name?: string,
  type: 'direct' | 'group' | 'broadcast' = 'direct'
) {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('create_conversation', {
        p_participants: participants,
        p_name: name || null,
        p_type: type,
      });
      if (error) throw error;
      return data as string;
    },
    {
      operation: 'createConversation',
      rpcName: 'create_conversation',
      params: { participants, name, type }
    }
  );
}

export async function getConversations(limit = 50, offset = 0): Promise<Conversation[]> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('get_conversations', {
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    {
      operation: 'getConversations',
      rpcName: 'get_conversations',
      params: { limit, offset }
    }
  );
}

export async function getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('get_conversation_participants', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
      return (data || []) as ConversationParticipant[];
    },
    {
      operation: 'getConversationParticipants',
      rpcName: 'get_conversation_participants',
      params: { conversationId }
    }
  );
}

export async function sendMessage(conversationId: string, body: string): Promise<number> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_content: body,
      });
      if (error) throw error;
      return data as number;
    },
    {
      operation: 'sendMessage',
      rpcName: 'send_message',
      params: { conversationId, body }
    }
  );
}

export async function getMessages(
  conversationId: string, 
  limit = 50, 
  offset = 0
): Promise<Message[]> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('get_messages_temp', {
        p_conversation_id: conversationId,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      return (data || []) as Message[];
    },
    {
      operation: 'getMessages',
      rpcName: 'get_messages_temp',
      params: { conversationId, limit, offset }
    }
  );
}

export async function markMessagesRead(conversationId: string): Promise<boolean> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
      return data as boolean;
    },
    {
      operation: 'markMessagesRead',
      rpcName: 'mark_messages_read',
      params: { conversationId }
    }
  );
}

export async function getUnreadCount(): Promise<number> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('get_unread_count');
      if (error) throw error;
      return data as number;
    },
    {
      operation: 'getUnreadCount',
      rpcName: 'get_unread_count',
      params: {}
    }
  );
}

export async function addParticipant(conversationId: string, userId: string): Promise<boolean> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('add_participant', {
        p_conversation_id: conversationId,
        p_user_id: userId,
      });
      if (error) throw error;
      return data as boolean;
    },
    {
      operation: 'addParticipant',
      rpcName: 'add_participant',
      params: { conversationId, userId }
    }
  );
}

export async function removeParticipant(conversationId: string, userId: string): Promise<boolean> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('remove_participant', {
        p_conversation_id: conversationId,
        p_user_id: userId,
      });
      if (error) throw error;
      return data as boolean;
    },
    {
      operation: 'removeParticipant',
      rpcName: 'remove_participant',
      params: { conversationId, userId }
    }
  );
}

