/**
 * Supabase RPC Client
 * Complete type-safe wrapper for all RPC functions
 * Auto-generated from Supabase schema - v0.3.0-beta
 */

import { getSupabase } from './supabase';
import type { Stage, Store, Priority } from '../types/db';

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

export async function completeFilling(orderId: string, performedBy?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_filling', {
    p_order_id: orderId,
    p_performed_by: performedBy || null,
  });
  if (error) throw error;
  return data;
}

export async function completeCovering(orderId: string, performedBy?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_covering', {
    p_order_id: orderId,
    p_performed_by: performedBy || null,
  });
  if (error) throw error;
  return data;
}

export async function completeDecorating(orderId: string, performedBy?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_decorating', {
    p_order_id: orderId,
    p_performed_by: performedBy || null,
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

export async function completePacking(orderId: string, performedBy?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('complete_packing', {
    p_order_id: orderId,
    p_performed_by: performedBy || null,
  });
  if (error) throw error;
  return data;
}

export async function qcReturnToDecorating(orderId: string, performedBy?: string, reason?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('qc_return_to_decorating', {
    p_order_id: orderId,
    p_performed_by: performedBy || null,
    p_reason: reason || null,
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
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_monitor_density', {
    p_store: store
  });
  if (error) throw error;
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

