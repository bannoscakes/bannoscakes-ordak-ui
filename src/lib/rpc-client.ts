/**
 * Supabase RPC Client
 * Complete type-safe wrapper for all RPC functions
 * Auto-generated from Supabase schema - v0.3.0-beta
 */

import { getSupabase } from './supabase';
import type { Stage, Store, Priority } from '../types/db';
import type {
  GetQueueRow,
  GetQueueStatsRow,
  GetStaffTimesRow,
  GetStaffTimesDetailRow,
  GetCompleteRow,
  FindOrderRow,
} from '../types/rpc-returns';
import { createError, handleError, logError, ErrorCode } from './error-handler';

// =============================================
// ERROR TYPES
// =============================================

interface SupabaseError {
  message?: string;
  code?: string;
  details?: string;
}

// =============================================
// MESSAGING TYPES
// =============================================

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
// PRINT BARCODE TYPES
// =============================================

export interface PrintBarcodeResponse {
  order_number: string;
  order_id: string;
  product_title: string;
  size: string | null;
  due_date: string;
  customer_name: string;
  stage: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  barcode_content: string;  // Format: #B25649 (Bannos) / #F25649 (Flourlane)
  printed_at: string;
  printed_by: string;
}

// =============================================
// SCANNER ORDER TYPES
// =============================================

export interface ScannerOrderResult {
  id: string;
  shopify_order_number: number;
  customer_name: string | null;
  product_title: string | null;
  size: string | null;
  notes: string | null;
  due_date: string | null;
  delivery_method: string | null;
  stage: string;
  priority: string;
  storage: string | null;
  store: 'bannos' | 'flourlane';
  filling_start_ts: string | null;
  covering_start_ts: string | null;
  decorating_start_ts: string | null;
  filling_complete_ts: string | null;
  covering_complete_ts: string | null;
  decorating_complete_ts: string | null;
  packing_start_ts: string | null;
  packing_complete_ts: string | null;
}

// =============================================
// SHIPPING ADDRESS TYPE (for packing slip)
// =============================================

export interface ShippingAddress {
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  province_code: string | null;
  country: string | null;
  country_code: string | null;
  zip: string | null;
  phone: string | null;
}

// =============================================
// ORDER RESULT TYPES
// =============================================

/**
 * Base order fields returned by both get_order and get_order_v2 RPCs
 */
interface OrderBaseResult {
  id: string;
  shopify_order_id: number | null;
  shopify_order_number: number | null;
  human_id: string | null;
  customer_name: string | null;
  product_title: string | null;
  flavour: string | null;
  size: string | null;
  item_qty: number | null;
  notes: string | null;
  cake_writing: string | null;
  product_image: string | null;
  delivery_method: string | null;
  due_date: string | null;
  stage: Stage;
  priority: Priority;
  storage: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  store: Store;
  currency: string | null;
  total_amount: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Legacy order result from get_order RPC
 * Does NOT include shipping_address or accessories
 */
export interface LegacyOrderResult extends OrderBaseResult {
  // Legacy RPC does not return these fields
}

/**
 * Extended order result from get_order_v2 RPC
 * Includes shipping_address and accessories for packing slip
 */
export interface OrderV2Result extends OrderBaseResult {
  shipping_address: ShippingAddress | null;
  accessories: Array<{ title: string; quantity: number; price: string; variant_title?: string | null }> | null;
}

// =============================================
// ERROR HANDLING WRAPPER
// =============================================

/**
 * Check if error is related to JWT/auth token expiration
 */
function isJWTError(error: unknown): boolean {
  if (!error) return false;

  const errorString = JSON.stringify(error).toLowerCase();
  const message = (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
    ? error.message.toLowerCase()
    : '';
  const code = (error && typeof error === 'object' && 'code' in error)
    ? String(error.code)
    : '';

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
  context: { operation: string; rpcName: string; params?: object; retryCount?: number }
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
      console.warn(`🔄 JWT error detected, attempting session refresh for ${context.rpcName}... (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Try to refresh the session before retrying
      try {
        const supabase = getSupabase();
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && data.session) {
          console.log('✅ Session refreshed successfully, retrying RPC call');
          // Session refreshed, retry the RPC call
          return withErrorHandling(rpcCall, { ...context, retryCount: retryCount + 1 });
        } else {
          console.warn('⚠️ Session refresh failed:', refreshError?.message || 'No session returned');
        }
      } catch (refreshErr) {
        console.error('❌ Session refresh exception:', refreshErr);
      }
      
      // If refresh failed, wait and retry anyway (token might auto-refresh)
      await new Promise(resolve => setTimeout(resolve, 500));
      return withErrorHandling(rpcCall, { ...context, retryCount: retryCount + 1 });
    }
    
    // If JWT error and out of retries, create specific auth error
    if (isJWTError(error)) {
      const appError = createError(
        ErrorCode.AUTH003,
        'Your session has expired. Please sign in again.',
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
      const supabaseError = error as SupabaseError;
      
      switch (supabaseError.code) {
        case '23505': // PostgreSQL unique constraint violation
          appError = createError(
            ErrorCode.INV005,
            'Duplicate entry. This item already exists.',
            { rpcName: context.rpcName, params: context.params, originalError: supabaseError },
            { operation: context.operation, duration }
          );
          break;
          
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
  store: 'bannos' | 'flourlane' | 'both';
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hourly_rate: number | null;
  approved: boolean;
}

export interface ActiveShift {
  staff_id: string;
  shift_id: string;
  store: string;
  start_ts: string;
}

export interface Component {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  is_active: boolean;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface Accessory {
  id: string;
  sku: string;
  name: string;
  category: 'topper' | 'balloon' | 'candle' | 'other';
  product_match: string;
  current_stock: number;
  min_stock: number;
  is_active: boolean;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
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

export async function getAllActiveShifts(): Promise<ActiveShift[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_all_active_shifts');
  if (error) throw error;
  return (data || []) as ActiveShift[];
}

export interface StaffWithShiftStatus {
  user_id: string;
  full_name: string;
  role: string;
  email: string | null;
  phone: string | null;
  store: string | null;
  is_active: boolean;
  shift_status: 'On Shift' | 'On Break' | 'Off Shift';
  shift_store: string | null;
  shift_start: string | null;
}

export async function getStaffWithShiftStatus(): Promise<StaffWithShiftStatus[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_with_shift_status');
  if (error) throw error;
  return (data || []) as StaffWithShiftStatus[];
}

export interface UpdateStaffMemberParams {
  userId: string;
  fullName?: string;
  role?: 'Admin' | 'Supervisor' | 'Staff';
  hourlyRate?: number;
  isActive?: boolean;
  approved?: boolean;
  phone?: string;
}

export async function updateStaffMember(params: UpdateStaffMemberParams): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('update_staff_member', {
    p_user_id: params.userId,
    p_full_name: params.fullName ?? null,
    p_role: params.role ?? null,
    p_hourly_rate: params.hourlyRate ?? null,
    p_is_active: params.isActive ?? null,
    p_approved: params.approved ?? null,
    p_phone: params.phone ?? null,
  });
  if (error) throw error;
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

export async function getQueue(params: GetQueueParams = {}): Promise<GetQueueRow[]> {
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
      return (data || []) as GetQueueRow[];
    },
    {
      operation: 'getQueue',
      rpcName: 'get_queue',
      params
    }
  );
}

export async function getQueueStats(store?: Store | null): Promise<GetQueueStatsRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_queue_stats', {
    p_store: store || null,
  });
  if (error) throw error;
  return (data?.[0] as GetQueueStatsRow) || null;
}

export async function getUnassignedCounts(store?: Store | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_unassigned_counts', {
    p_store: store || null,
  });
  if (error) throw error;
  return data || [];
}

/**
 * Get order by ID (legacy RPC)
 * Use getOrderV2 for extended data including shipping_address and accessories
 */
export async function getOrder(orderId: string, store: Store): Promise<LegacyOrderResult | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_order', {
    p_order_id: orderId,
    p_store: store,
  });
  if (error) throw error;
  return (data?.[0] as LegacyOrderResult) || null;
}

/**
 * Get order with extended data including shipping_address and accessories
 * Used for packing slip and order detail drawer
 */
export async function getOrderV2(orderId: string, store: Store): Promise<OrderV2Result | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_order_v2', {
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

/**
 * Bulk assign staff to multiple orders in a single transaction.
 * Returns the count of successfully assigned orders.
 */
export async function assignStaffBulk(orderIds: string[], store: Store, staffId: string): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('assign_staff_bulk', {
    p_order_ids: orderIds,
    p_store: store,
    p_staff_id: staffId,
  });
  if (error) throw error;
  return data as number;
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
    p_store: store,
    p_order_id: orderId,
    p_storage: storageLocation,
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
  cake_writing?: string;
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
    p_cake_writing: updates.cake_writing || null,
  });
  if (error) throw error;
  return data;
}

// =============================================
// SCANNER & STAGE MANAGEMENT
// =============================================

export async function handlePrintBarcode(barcode: string, orderId: string, performedBy?: string, context?: Record<string, unknown>) {
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

/**
 * Print barcode for an order - logs to stage_events and sets filling_start_ts on first print
 * Returns order details including barcode_content in format #B25649 (Bannos) / #F25649 (Flourlane)
 */
export async function printBarcode(store: string, orderId: string): Promise<PrintBarcodeResponse> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('print_barcode', {
    p_store: store,
    p_order_id: orderId
  });
  if (error) throw error;
  return data as PrintBarcodeResponse;
}

/**
 * Lookup order by any barcode format
 * Supports: #B18617, #F18617, bannos-18617, flourlane-18617, or plain 18617
 */
export async function getOrderForScan(scan: string): Promise<ScannerOrderResult | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_order_for_scan', {
    p_scan: scan,
  });
  if (error) throw error;
  return data as ScannerOrderResult | null;
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

export async function startCovering(orderId: string, store: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('start_covering', {
    p_order_id: orderId,
    p_store: store,
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

export async function startDecorating(orderId: string, store: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('start_decorating', {
    p_order_id: orderId,
    p_store: store,
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
// INVENTORY MANAGEMENT - SIMPLIFIED
// =============================================

export async function getComponents(params: {
  category?: string;
  active_only?: boolean;
  search?: string;
} = {}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_components', {
    p_category: params.category || null,
    p_active_only: params.active_only ?? true,
    p_search: params.search || null,
  });
  if (error) throw error;
  return (data || []) as Component[];
}

export async function getLowStockComponents() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_low_stock_components');
  if (error) throw error;
  return data || [];
}

export async function upsertComponent(params: {
  id?: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  min_stock?: number;
  unit?: string;
  is_active?: boolean;
}): Promise<string> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('upsert_component', {
        p_id: params.id || null,
        p_sku: params.sku,
        p_name: params.name,
        p_description: params.description || null,
        p_category: params.category || 'other',
        p_min_stock: params.min_stock || 0,
        p_unit: params.unit || 'each',
        p_is_active: params.is_active !== false,
      });
      if (error) throw error;
      return data as string;
    },
    {
      operation: 'upsertComponent',
      rpcName: 'upsert_component',
      params
    }
  );
}

export async function adjustComponentStock(params: {
  component_id: string;
  change: number;
  reason: string;
  reference?: string;
  created_by?: string;
}) {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('adjust_component_stock', {
        p_component_id: params.component_id,
        p_change: params.change,
        p_reason: params.reason,
        p_reference: params.reference || null,
        p_created_by: params.created_by || null,
      });
      if (error) throw error;
      return data as { success: boolean; error?: string; component?: string; before?: number; after?: number; change?: number };
    },
    {
      operation: 'adjustComponentStock',
      rpcName: 'adjust_component_stock',
      params
    }
  );
}

export async function deleteComponent(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('delete_component', { p_id: id });
  if (error) throw error;
  return data as boolean;
}

// =============================================
// BOM MANAGEMENT - SIMPLIFIED
// =============================================

export interface BOMItem {
  id: string;
  bom_id?: string;
  component_id: string;
  component_name: string;
  component_sku: string;
  quantity_required: number;
  quantity_per_unit?: number;
  is_optional?: boolean;
  stage?: 'Filling' | 'Decorating' | 'Packing' | null;
  created_at?: string;
  updated_at?: string;
}

export interface BOM {
  id: string;
  product_title: string;
  store: 'bannos' | 'flourlane' | 'both';
  description?: string;
  shopify_product_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items: BOMItem[];
}

export async function getBoms(store?: string | null, activeOnly: boolean = true, search?: string | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_boms', {
    p_store: store || null,
    p_active_only: activeOnly,
    p_search: search || null,
  });
  if (error) throw error;
  return (data || []) as BOM[];
}

export async function getBomByProduct(productTitle: string, store: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_bom_by_product', {
    p_product_title: productTitle,
    p_store: store,
  });
  if (error) throw error;
  return data || [];
}

// Raw row type from get_bom_details RPC
interface BomDetailsRow {
  bom_id: string;
  product_title: string;
  store: 'bannos' | 'flourlane' | 'both';
  description: string | null;
  component_id: string | null;
  component_sku: string | null;
  component_name: string | null;
  quantity_required: number | null;
  unit: string | null;
  current_stock: number | null;
  is_optional: boolean;
  notes: string | null;
  stage_to_consume: 'Filling' | 'Decorating' | 'Packing' | null;
}

/**
 * Fetch BOM details including all items for a specific BOM
 * Use this when opening a BOM for editing to get the full item list
 */
export async function getBomDetails(bomId: string): Promise<BOMItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_bom_details', {
    p_bom_id: bomId,
  });
  if (error) throw error;

  // Transform flat RPC result to BOMItem array
  return (data || [])
    .filter((row: BomDetailsRow) => row.component_id !== null) // Filter out BOMs with no items
    .map((row: BomDetailsRow) => ({
      id: `${row.bom_id}-${row.component_id}`, // Composite ID for UI
      bom_id: row.bom_id,
      component_id: row.component_id,
      component_name: row.component_name,
      component_sku: row.component_sku,
      quantity_per_unit: row.quantity_required, // Map to UI field name
      stage: row.stage_to_consume as 'Filling' | 'Decorating' | 'Packing' | undefined,
      is_optional: row.is_optional,
      created_at: new Date().toISOString(), // Not returned by RPC
      updated_at: new Date().toISOString(), // Not returned by RPC
    }));
}

export async function upsertBom(params: {
  id?: string;
  product_title: string;
  store: 'bannos' | 'flourlane' | 'both';
  description?: string;
  is_active?: boolean;
  shopify_product_id?: string;
}): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('upsert_bom', {
    p_id: params.id || null,
    p_product_title: params.product_title,
    p_store: params.store,
    p_description: params.description || null,
    p_is_active: params.is_active !== false,
    p_shopify_product_id: params.shopify_product_id || null,
  });
  if (error) throw error;
  return data as string; // Returns the BOM ID
}

export async function addBomComponent(params: {
  bom_id: string;
  component_id: string;
  quantity_required: number;
  unit?: string;
  is_optional?: boolean;
  notes?: string;
  stage?: string;
}): Promise<void> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { error } = await supabase.rpc('add_bom_component', {
        p_bom_id: params.bom_id,
        p_component_id: params.component_id,
        p_quantity_required: params.quantity_required,
        p_unit: params.unit || 'each',
        p_is_optional: params.is_optional || false,
        p_notes: params.notes || null,
        p_stage: params.stage || null,
      });
      if (error) throw error;
    },
    {
      operation: 'addBomComponent',
      rpcName: 'add_bom_component',
      params
    }
  );
}

export async function removeBomComponent(params: {
  bom_id: string;
  component_id: string;
}): Promise<void> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { error } = await supabase.rpc('remove_bom_component', {
        p_bom_id: params.bom_id,
        p_component_id: params.component_id,
      });
      if (error) throw error;
    },
    {
      operation: 'removeBomComponent',
      rpcName: 'remove_bom_component',
      params
    }
  );
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
  return data as string;
}

export async function saveBomItems(bomId: string, items: Array<{
  component_id: string;
  quantity_required: number;
  stage?: string | null;
}>): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('save_bom_items', {
    p_bom_id: bomId,
    p_items: items,
  });
  if (error) throw error;
  return data as number;
}

export async function deleteBom(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('delete_bom', { p_id: id });
  if (error) throw error;
  return data as boolean;
}

// Deduction result from deduct_for_order RPC
interface DeductionResult {
  component_id: string;
  component_name: string;
  quantity_deducted: number;
  previous_stock: number;
  new_stock: number;
}

interface DeductForOrderResponse {
  success: boolean;
  error?: string;
  bom_id?: string;
  order_id?: string;
  quantity?: number;
  deductions?: DeductionResult[];
}

export async function deductForOrder(params: {
  order_id: string;
  product_title: string;
  store: string;
  quantity?: number;
  created_by?: string;
}): Promise<DeductForOrderResponse> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('deduct_for_order', {
        p_order_id: params.order_id,
        p_product_title: params.product_title,
        p_store: params.store,
        p_quantity: params.quantity || 1,
        p_created_by: params.created_by || null,
      });
      if (error) throw error;
      return data as DeductForOrderResponse;
    },
    {
      operation: 'deductForOrder',
      rpcName: 'deduct_for_order',
      params
    }
  );
}

// =============================================
// ACCESSORIES MANAGEMENT - SIMPLIFIED
// =============================================

export async function getAccessories(params: {
  category?: string;
  active_only?: boolean;
} = {}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_accessories', {
    p_category: params.category || null,
    p_active_only: params.active_only ?? true,
  });
  if (error) throw error;
  return (data || []) as Accessory[];
}

export async function getAccessoriesNeedingSync() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_accessories_needing_sync');
  if (error) throw error;
  return data || [];
}

export async function upsertAccessory(params: {
  id?: string;
  sku: string;
  name: string;
  category: 'topper' | 'balloon' | 'candle' | 'other';
  product_match: string;
  min_stock?: number;
  is_active?: boolean;
}): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('upsert_accessory', {
    p_id: params.id || null,
    p_sku: params.sku,
    p_name: params.name,
    p_category: params.category,
    p_product_match: params.product_match,
    p_min_stock: params.min_stock || 5,
    p_is_active: params.is_active !== false,
  });
  if (error) throw error;
  return data as string;
}

export async function adjustAccessoryStock(params: {
  accessory_id: string;
  change: number;
  reason: string;
  reference?: string;
  created_by?: string;
}) {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('adjust_accessory_stock', {
        p_accessory_id: params.accessory_id,
        p_change: params.change,
        p_reason: params.reason,
        p_reference: params.reference || null,
        p_created_by: params.created_by || null,
      });
      if (error) throw error;
      return data as { success: boolean; error?: string; accessory?: string; before?: number; after?: number; change?: number; needs_sync?: boolean };
    },
    {
      operation: 'adjustAccessoryStock',
      rpcName: 'adjust_accessory_stock',
      params
    }
  );
}

export async function deleteAccessory(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('soft_delete_accessory', { p_id: id });
  if (error) throw error;
}

// =============================================
// CAKE TOPPERS MANAGEMENT
// =============================================

export interface CakeTopper {
  id: string;
  name_1: string;
  name_2: string | null;
  current_stock: number;
  min_stock: number;
  shopify_product_id_1: string | null;
  shopify_product_id_2: string | null;
  is_active: boolean;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  created_at: string;
  updated_at: string;
}

// Raw RPC result without computed fields
type RawCakeTopper = Omit<CakeTopper, 'is_low_stock' | 'is_out_of_stock'>;

export async function getCakeToppers(params: {
  activeOnly?: boolean;
} = {}): Promise<CakeTopper[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_cake_toppers', {
    p_active_only: params.activeOnly ?? true,  // Default to showing active only
  });
  if (error) throw error;

  // Add computed fields
  return (data || []).map((topper: RawCakeTopper) => ({
    ...topper,
    is_low_stock: topper.current_stock < topper.min_stock && topper.current_stock > 0,
    is_out_of_stock: topper.current_stock === 0,
  }));
}

export async function upsertCakeTopper(params: {
  id?: string;
  name_1: string;
  name_2?: string | null;
  min_stock?: number;
  shopify_product_id_1?: string | null;
  shopify_product_id_2?: string | null;
  is_active?: boolean;
}): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('upsert_cake_topper', {
    p_id: params.id || null,
    p_name_1: params.name_1,
    p_name_2: params.name_2 || null,
    p_min_stock: params.min_stock || 5,
    p_shopify_product_id_1: params.shopify_product_id_1 || null,
    p_shopify_product_id_2: params.shopify_product_id_2 || null,
    p_is_active: params.is_active !== false,
  });
  if (error) throw error;
  return data as string;
}

export async function adjustCakeTopperStock(params: {
  topper_id: string;
  change: number;
  reason: string;
  reference?: string;
  created_by?: string;
}) {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('adjust_cake_topper_stock', {
        p_topper_id: params.topper_id,
        p_change: params.change,
        p_reason: params.reason,
        p_reference: params.reference || null,
        p_created_by: params.created_by || null,
      });
      if (error) throw error;
      return data as { success: boolean; old_stock: number; new_stock: number; name_1: string; name_2: string | null };
    },
    {
      operation: 'adjustCakeTopperStock',
      rpcName: 'adjust_cake_topper_stock',
      params
    }
  );
}

export async function deleteCakeTopper(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('soft_delete_cake_topper', { p_id: id });
  if (error) throw error;
}

// =============================================
// STOCK TRANSACTIONS (AUDIT LOG) - SIMPLIFIED
// =============================================

export interface StockTransaction {
  id: string;
  table_name: 'components' | 'accessories';
  item_id: string;
  item_name: string;
  change_amount: number;
  stock_before: number;
  stock_after: number;
  reason: string;
  reference?: string;
  created_by?: string;
  created_at: string;
}

export async function getStockTransactions(params: {
  table_name?: string;
  item_id?: string;
  limit?: number;
} = {}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_stock_transactions', {
    p_table_name: params.table_name || null,
    p_item_id: params.item_id || null,
    p_limit: params.limit || 100,
  });
  if (error) throw error;
  return (data || []) as StockTransaction[];
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

// JSON-compatible value type for settings
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export async function setSetting(store: Store, key: string, value: JsonValue) {
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

export async function setPrintingSettings(store: Store, settings: Record<string, JsonValue>) {
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
} = {}): Promise<GetCompleteRow[]> {
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
  return (data || []) as GetCompleteRow[];
}

// =============================================
// UNIVERSAL ORDER SEARCH (ALL STAGES)
// =============================================

export async function findOrder(search: string): Promise<FindOrderRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('find_order', {
    p_search: search,
  });
  if (error) throw error;
  return (data || []) as FindOrderRow[];
}

// =============================================
// SHOPIFY INTEGRATION
// =============================================

export async function testAdminToken(store: Store, token: string) {
  const supabase = getSupabase();
  
  // Step 1: Call RPC to create sync run and save token
  const { data: rpcData, error: rpcError } = await supabase.rpc('test_admin_token', {
    p_store: store,
    p_token: token,
  });
  if (rpcError) throw rpcError;
  
  // Step 2: Invoke Edge Function to actually test the token
  const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('test-shopify-token', {
    body: {
      store,
      token,
      run_id: rpcData.run_id
    }
  });
  
  if (edgeFunctionError) throw edgeFunctionError;
  return edgeFunctionData;
}

export async function syncShopifyOrders(store: Store) {
  const supabase = getSupabase();
  
  // Step 1: Call RPC to create sync run and get token
  const { data: rpcData, error: rpcError } = await supabase.rpc('sync_shopify_orders', {
    p_store: store,
  });
  if (rpcError) throw rpcError;
  
  // Step 2: Get the token from settings (RPC already validated it exists)
  // Use ->> operator to extract text from JSONB
  const { data: settingsData, error: settingsError } = await supabase
    .from('settings')
    .select('value')
    .eq('store', store)
    .eq('key', 'shopifyToken')
    .single();
  
  if (settingsError) throw settingsError;
  // Token is stored as JSONB via to_jsonb(p_token), extract as string
  let token: string;
  if (typeof settingsData?.value === 'string') {
    token = settingsData.value;
  } else if (settingsData?.value && typeof settingsData.value === 'object') {
    // JSONB object - shouldn't happen, but throw error rather than stringify
    throw new Error('Token is stored as object in database - expected string');
  } else {
    throw new Error('No token found in settings');
  }
  
  // Step 3: Invoke Edge Function to actually sync orders
  const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('sync-shopify-orders', {
    body: {
      store,
      token,
      run_id: rpcData.run_id
    }
  });
  
  if (edgeFunctionError) throw edgeFunctionError;
  return edgeFunctionData;
}

export async function getSyncLog(store?: Store, limit?: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_sync_log', {
    p_store: store || null,
    p_limit: limit || 50,
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

export async function getStaffTimes(from: string, to: string, staffId?: string): Promise<GetStaffTimesRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_times', {
    p_from: from,
    p_to: to,
    p_staff_id: staffId || null,
  });
  if (error) throw error;
  return (data || []) as GetStaffTimesRow[];
}

export async function getStaffTimesDetail(staffId: string, from: string, to: string): Promise<GetStaffTimesDetailRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_times_detail', {
    p_staff_id: staffId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return (data || []) as GetStaffTimesDetailRow[];
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
// STAFF ANALYTICS
// =============================================

export async function getStaffAttendanceRate(days: number = 30) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_attendance_rate', {
    p_days: days,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function getStaffAvgProductivity(days: number = 30) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_avg_productivity', {
    p_days: days,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function getDepartmentPerformance(days: number = 30) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_department_performance', {
    p_days: days,
  });
  if (error) throw error;
  return data || [];
}

export async function getStoreProductionEfficiency(store: Store, days: number = 30) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_store_production_efficiency', {
    p_store: store,
    p_days: days,
  });
  if (error) throw error;
  return data || [];
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

export async function markOrderComplete(orderId: string, store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('mark_order_complete', {
    p_order_id: orderId,
    p_store: store,
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

// =============================================
// MANUAL ORDER CREATION
// =============================================

export interface CreateManualOrderParams {
  store: Store;
  order_number: string;
  customer_name: string;
  product_title: string;
  size: string;
  flavour: string;
  due_date: string; // ISO date string (YYYY-MM-DD)
  writing_on_cake?: string | null;
  image_url?: string | null;
  notes?: string | null;
}

export async function createManualOrder(params: CreateManualOrderParams): Promise<string> {
  return withErrorHandling(
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('create_manual_order', {
        p_store: params.store,
        p_order_number: params.order_number,
        p_customer_name: params.customer_name,
        p_product_title: params.product_title,
        p_size: params.size,
        p_flavour: params.flavour,
        p_due_date: params.due_date,
        p_writing_on_cake: params.writing_on_cake || null,
        p_image_url: params.image_url || null,
        p_notes: params.notes || null,
      });
      if (error) throw error;
      return data as string;
    },
    {
      operation: 'createManualOrder',
      rpcName: 'create_manual_order',
      params
    }
  );
}

// =============================================
// STORE ANALYTICS
// =============================================

export interface StoreAnalytics {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  pending_today: number;
}

export interface RevenueByDay {
  day: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  product_title: string;
  order_count: number;
  total_revenue: number;
}

export interface WeeklyForecast {
  day_of_week: number;
  day_date: string;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
}

export interface DeliveryBreakdown {
  delivery_method: string;
  order_count: number;
  percentage: number;
}

// Helper to coerce numeric strings to numbers (Supabase may return bigint/numeric as strings)
function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
}

export async function getStoreAnalytics(
  store: Store,
  startDate?: string,
  endDate?: string
): Promise<StoreAnalytics | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_store_analytics', {
    p_store: store,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    total_revenue: toNum(row.total_revenue),
    total_orders: toNum(row.total_orders),
    avg_order_value: toNum(row.avg_order_value),
    pending_today: toNum(row.pending_today),
  };
}

export async function getRevenueByDay(
  store: Store,
  startDate?: string,
  endDate?: string
): Promise<RevenueByDay[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_revenue_by_day', {
    p_store: store,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });
  if (error) throw error;
  return (data || []).map((d: Record<string, unknown>) => ({
    day: String(d.day),
    revenue: toNum(d.revenue),
    orders: toNum(d.orders),
  }));
}

export async function getTopProducts(
  store: Store,
  startDate?: string,
  endDate?: string,
  limit: number = 5
): Promise<TopProduct[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_top_products', {
    p_store: store,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data || []).map((d: Record<string, unknown>) => ({
    product_title: String(d.product_title || 'Unknown'),
    order_count: toNum(d.order_count),
    total_revenue: toNum(d.total_revenue),
  }));
}

export async function getWeeklyForecast(
  store: Store,
  weekStart?: string
): Promise<WeeklyForecast[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_weekly_forecast', {
    p_store: store,
    p_week_start: weekStart || null,
  });
  if (error) throw error;
  return (data || []).map((d: Record<string, unknown>) => ({
    day_of_week: toNum(d.day_of_week),
    day_date: String(d.day_date),
    total_orders: toNum(d.total_orders),
    completed_orders: toNum(d.completed_orders),
    pending_orders: toNum(d.pending_orders),
  }));
}

export async function getDeliveryBreakdown(
  store: Store,
  weekStart?: string
): Promise<DeliveryBreakdown[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_delivery_breakdown', {
    p_store: store,
    p_week_start: weekStart || null,
  });
  if (error) throw error;
  return (data || []).map((d: Record<string, unknown>) => ({
    delivery_method: String(d.delivery_method || 'Unknown'),
    order_count: toNum(d.order_count),
    percentage: toNum(d.percentage),
  }));
}

// =============================================
// STAFF STAGE PERFORMANCE
// =============================================

export interface StaffStagePerformance {
  staff_id: string;
  staff_name: string;
  filling_count: number;
  covering_count: number;
  decorating_count: number;
  packing_count: number;
  total_count: number;
}

export async function getStaffStagePerformance(
  days: number = 30
): Promise<StaffStagePerformance[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_staff_stage_performance', {
    p_days: days,
  });
  if (error) throw error;
  return (data || []).map((d: Record<string, unknown>) => ({
    staff_id: String(d.staff_id || ''),
    staff_name: String(d.staff_name || 'Unknown'),
    filling_count: toNum(d.filling_count),
    covering_count: toNum(d.covering_count),
    decorating_count: toNum(d.decorating_count),
    packing_count: toNum(d.packing_count),
    total_count: toNum(d.total_count),
  }));
}

