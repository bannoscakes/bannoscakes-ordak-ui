/**
 * Supabase RPC Client
 * Complete type-safe wrapper for all RPC functions
 * Auto-generated from Supabase schema - v0.3.0-beta
 */

import { getSupabase } from './supabase';
import type { Stage, Store, Priority } from '../types/db';

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

// =============================================
// SCANNER & STAGE MANAGEMENT
// =============================================

export async function handlePrintBarcode(orderId: string, store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('handle_print_barcode', {
    p_order_id: orderId,
    p_store: store,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function getOrderForScan(barcodeData: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_order_for_scan', {
    p_barcode_data: barcodeData,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function completeFilling(orderId: string, store: Store, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_filling', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function completeCovering(orderId: string, store: Store, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_covering', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function completeDecorating(orderId: string, store: Store, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_decorating', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function completePacking(orderId: string, store: Store, notes?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_packing', {
    p_order_id: orderId,
    p_store: store,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function qcReturnToDecorating(orderId: string, store: Store, notes?: string) {
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

export async function startShift(staffId?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('start_shift', {
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

export async function updateComponentStock(
  componentId: string,
  quantityChange: number,
  reason?: string,
  referenceOrderId?: string
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('update_component_stock', {
    p_component_id: componentId,
    p_quantity_change: quantityChange,
    p_reason: reason || null,
    p_reference_order_id: referenceOrderId || null,
  });
  if (error) throw error;
  return data;
}

// =============================================
// SETTINGS MANAGEMENT
// =============================================

export async function getFlavours(store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_flavours', {
    p_store: store,
  });
  if (error) throw error;
  return data;
}

export async function getStorageLocations(store: Store) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_storage_locations', {
    p_store: store,
  });
  if (error) throw error;
  return data;
}

export async function setFlavours(store: Store, flavours: string[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_flavours', {
    p_store: store,
    p_flavours: JSON.stringify(flavours),
  });
  if (error) throw error;
  return data;
}

export async function setStorageLocations(store: Store, locations: string[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('set_storage_locations', {
    p_store: store,
    p_locations: JSON.stringify(locations),
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

