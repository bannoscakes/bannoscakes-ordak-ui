#!/usr/bin/env node
/**
 * Parse RPC functions from production and generate migration files
 * Usage: node scripts/parse_rpcs.js
 */

const fs = require('fs');
const path = require('path');

// Read JSON from file
const jsonPath = path.join(__dirname, 'production_rpcs.json');
let functions;
try {
  const jsonData = fs.readFileSync(jsonPath, 'utf8');
  functions = JSON.parse(jsonData);
  console.log(`✅ Parsed ${functions.length} functions from production`);
} catch (err) {
  console.error('❌ Failed to read/parse JSON:', err.message);
  console.error('   Make sure scripts/production_rpcs.json exists');
  process.exit(1);
}

// Categorize functions by purpose
const categories = {
  auth_helpers: {
    file: '040_core_auth_helpers.sql',
    description: 'Core authentication and authorization helpers',
    functions: [
      'auth_email',
      'app_role',
      'app_can_access_store',
      'app_is_service_role',
      'feature_rls_enabled',
      'rls_bypass',
      'current_user_name',
      '_order_lock',
      'alpha_suffix',
      'settings_get_bool'
    ]
  },
  staff_management: {
    file: '041_staff_management.sql',
    description: 'Staff and user management RPCs',
    functions: [
      'get_staff_list',
      'get_staff_me',
      'get_staff_member'
      // Note: get_staff_stats moved to queue_orders due to orders table dependency
      // Note: get_staff() dropped - unused, replaced by get_staff_list
    ]
  },
  queue_orders: {
    file: '042_queue_orders.sql',
    description: 'Queue and order retrieval RPCs',
    functions: [
      'get_queue',
      'get_queue_minimal',
      'get_queue_stats',
      'get_complete_minimal',
      'get_order_for_scan',
      'get_unassigned_counts',
      'assign_staff',
      'update_order_core',
      'get_staff_stats'  // Moved from staff_management due to orders table dependency
    ]
  },
  stage_completion: {
    file: '043_scanner_stage_completion.sql',
    description: 'Stage completion and scanner RPCs',
    functions: [
      'complete_filling',
      'complete_covering',
      'complete_decorating',
      'complete_packing',
      'qc_return_to_decorating',
      'handle_print_barcode',
      'start_packing'
    ]
  },
  settings: {
    file: '044_settings.sql',
    description: 'Settings management RPCs',
    functions: [
      'get_setting',
      'get_settings',
      'set_setting',
      'get_flavours',
      'set_flavours',
      'get_storage_locations',
      'set_storage_locations',
      'get_due_date_settings',
      'set_due_date_settings',
      'get_monitor_density',
      'set_monitor_density',
      'get_printing_settings',
      'set_printing_settings'
    ]
  },
  inventory: {
    file: '045_inventory.sql',
    description: 'Inventory and component management RPCs',
    functions: [
      'get_components',
      'upsert_component',
      'get_low_stock_components',
      'update_component_stock',
      'get_stock_transactions',
      'record_component_txn',
      'get_boms',
      'get_bom_details',
      'upsert_bom',
      'add_bom_component',
      'remove_bom_component',
      'get_product_requirements',
      'add_product_requirement',
      'upsert_product_requirement',
      'get_accessory_keywords',
      'upsert_accessory_keyword',
      'delete_accessory_keyword',
      'find_component_by_keyword',
      'deduct_inventory_for_order',
      'restock_order'
    ]
  },
  messaging: {
    file: '046_messaging.sql',
    description: 'Messaging and conversation RPCs',
    functions: [
      'create_conversation',
      'create_conversation_text',
      'get_conversations',
      'get_conversation_participants',
      'add_participant',
      'remove_participant',
      'send_message',
      'get_messages',
      'get_messages_temp',
      'get_messages_temp_test',
      'get_messages_debug',
      'mark_messages_read',
      'get_unread_count'
    ]
  },
  workers: {
    file: '047_workers_background_jobs.sql',
    description: 'Background workers and job processing',
    functions: [
      'process_webhook_order_split',
      'process_kitchen_task_create',
      'is_cake_item'
    ]
  },
  triggers: {
    file: '048_order_updates_triggers.sql',
    description: 'Triggers and helper functions',
    functions: [
      'orders_set_human_id',
      'set_updated_at'
    ]
  },
  test_functions: {
    file: '049_test_functions.sql',
    description: 'Test and debugging functions (optional)',
    functions: [
      'test_auth',
      'test_rpc_call'
    ]
  }
};

// Build a lookup map
const functionToCategory = {};
Object.entries(categories).forEach(([catKey, catData]) => {
  catData.functions.forEach(fname => {
    functionToCategory[fname] = catKey;
  });
});

// Group functions by category
const grouped = {};
Object.keys(categories).forEach(key => {
  grouped[key] = [];
});
const uncategorized = [];

functions.forEach(func => {
  const fname = func.function_name;
  const catKey = functionToCategory[fname];
  
  if (catKey) {
    grouped[catKey].push(func);
  } else {
    uncategorized.push(func);
  }
});

// Report uncategorized
if (uncategorized.length > 0) {
  console.log(`\n⚠️  Uncategorized functions (${uncategorized.length}):`);
  uncategorized.forEach(f => console.log(`   - ${f.function_name}`));
}

// Generate migration files
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

Object.entries(categories).forEach(([catKey, catData]) => {
  const funcs = grouped[catKey];
  
  if (funcs.length === 0) {
    console.log(`⏭️  Skipping ${catData.file} (no functions)`);
    return;
  }
  
  let content = `-- Migration: ${catData.description}\n`;
  content += `-- Generated: ${new Date().toISOString()}\n`;
  content += `-- Functions: ${funcs.length}\n\n`;
  
  funcs.forEach((func, idx) => {
    content += `-- Function ${idx + 1}/${funcs.length}: ${func.function_name}\n`;
    content += func.function_definition;
    content += '\n\n';
  });
  
  const filepath = path.join(migrationsDir, catData.file);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✅ Created ${catData.file} with ${funcs.length} functions`);
});

console.log('\n🎉 Migration files generated successfully!');
console.log('\n📋 Summary:');
Object.entries(categories).forEach(([catKey, catData]) => {
  const count = grouped[catKey].length;
  console.log(`   ${catData.file}: ${count} functions`);
});
console.log(`\n   Total: ${functions.length} functions`);

