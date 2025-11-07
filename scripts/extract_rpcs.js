#!/usr/bin/env node

/**
 * RPC Extraction Script
 * 
 * Parses scripts/all_functions.sql and extracts function definitions
 * into organized migration files (005-013)
 */

const fs = require('fs');
const path = require('path');

// Function categories and their target functions
const MIGRATIONS = {
  '005_core_auth_helpers': [
    '_order_lock',
    'alpha_suffix',
    'app_can_access_store',
    'app_is_service_role',
    'app_role',
    'auth_email',
    'current_user_name',
    'feature_rls_enabled',
    'rls_bypass',
    'settings_get_bool'
  ],
  '006_staff_management': [
    'get_staff',
    'get_staff_list',
    'get_staff_me',
    'get_staff_member',
    'get_staff_stats',
    'assign_staff'
  ],
  '007_queue_orders': [
    'get_queue',
    'get_queue_minimal',
    'get_queue_stats',
    'get_unassigned_counts',
    'get_complete_minimal',
    'get_order_for_scan',
    'admin_delete_order'
  ],
  '008_scanner_stage_completion': [
    'complete_filling',
    'complete_covering',
    'complete_decorating',
    'complete_packing',
    'handle_print_barcode',
    'start_packing',
    'assign_staff_to_order',
    'move_to_filling_with_assignment',
    'qc_return_to_decorating'
  ],
  '009_settings': [
    'get_setting',
    'get_settings',
    'set_setting',
    'get_flavours',
    'set_flavours',
    'get_storage_locations',
    'set_storage_locations',
    'get_monitor_density',
    'set_monitor_density',
    'get_due_date_settings',
    'set_due_date_settings',
    'get_printing_settings',
    'set_printing_settings'
  ],
  '010_inventory': [
    'get_components',
    'upsert_component',
    'update_component_stock',
    'get_low_stock_components',
    'get_stock_transactions',
    'get_boms',
    'get_bom_details',
    'upsert_bom',
    'add_bom_component',
    'remove_bom_component',
    'get_accessory_keywords',
    'upsert_accessory_keyword',
    'delete_accessory_keyword',
    'find_component_by_keyword',
    'get_product_requirements',
    'add_product_requirement',
    'upsert_product_requirement',
    'deduct_inventory_for_order',
    'restock_order',
    'record_component_txn'
  ],
  '011_messaging': [
    'create_conversation',
    'create_conversation_text',
    'get_conversations',
    'get_conversation_participants',
    'get_messages',
    'get_messages_temp',
    'send_message',
    'mark_messages_read',
    'get_unread_count',
    'add_participant',
    'remove_participant'
  ],
  '012_workers_background_jobs': [
    'process_webhook_order_split',
    'process_kitchen_task_create',
    'ingest_order',
    'is_cake_item'
  ],
  '013_order_updates_triggers': [
    'update_order_core',
    'orders_set_human_id',
    'set_updated_at',
    'test_auth',
    'test_rpc_call'
  ]
};

/**
 * Parse the all_functions.sql file and extract individual functions
 */
function parseFunctions(sqlContent) {
  const functions = {};
  
  // Split by function headers (-- Function: name)
  const lines = sqlContent.split('\n');
  let currentFunction = null;
  let currentContent = [];
  let inFunction = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Remove CSV pipe separators if present (format: "| content")
    if (line.startsWith('|')) {
      line = line.substring(1).trim();
    }
    
    // Skip empty lines and separator lines
    if (!line || line.startsWith('---')) {
      continue;
    }
    
    // Check for function header
    if (line.startsWith('-- Function: ')) {
      // Save previous function if exists
      if (currentFunction && currentContent.length > 0) {
        const funcName = currentFunction.toLowerCase();
        if (!functions[funcName]) {
          functions[funcName] = [];
        }
        functions[funcName].push(currentContent.join('\n').trim());
      }
      
      // Start new function
      currentFunction = line.replace('-- Function: ', '').trim();
      currentContent = [line];
      inFunction = true;
    } else if (inFunction) {
      currentContent.push(line);
      
      // Check if we've reached the end of the function
      // Functions end with $function$; followed by empty lines
      if (line.trim() === ';' && i + 1 < lines.length && lines[i + 1].trim() === '') {
        // Save this function
        const funcName = currentFunction.toLowerCase();
        if (!functions[funcName]) {
          functions[funcName] = [];
        }
        functions[funcName].push(currentContent.join('\n').trim());
        
        inFunction = false;
        currentFunction = null;
        currentContent = [];
      }
    }
  }
  
  // Save last function if exists
  if (currentFunction && currentContent.length > 0) {
    const funcName = currentFunction.toLowerCase();
    if (!functions[funcName]) {
      functions[funcName] = [];
    }
    functions[funcName].push(currentContent.join('\n').trim());
  }
  
  return functions;
}

/**
 * Generate migration file header
 */
function generateHeader(migrationName, functionNames) {
  const title = migrationName.replace(/^\d+_/, '').replace(/_/g, ' ').toUpperCase();
  const date = new Date().toISOString().split('T')[0];
  
  return `-- =====================================================
-- Migration: ${title}
-- Date: ${date}
-- Description: Extract production RPCs for ${title.toLowerCase()}
-- =====================================================
-- 
-- Functions in this migration:
${functionNames.map(name => `--   - ${name}`).join('\n')}
--
-- =====================================================

`;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting RPC extraction...\n');
  
  // Read the all_functions.sql file
  const inputFile = path.join(__dirname, 'all_functions.sql');
  console.log(`📖 Reading: ${inputFile}`);
  
  if (!fs.existsSync(inputFile)) {
    console.error('❌ Error: scripts/all_functions.sql not found!');
    process.exit(1);
  }
  
  const sqlContent = fs.readFileSync(inputFile, 'utf-8');
  console.log(`✅ Loaded ${sqlContent.length.toLocaleString()} characters\n`);
  
  // Parse functions
  console.log('🔍 Parsing functions...');
  const functions = parseFunctions(sqlContent);
  console.log(`✅ Found ${Object.keys(functions).length} unique function names\n`);
  
  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  // Generate migration files
  let totalFunctions = 0;
  let totalVersions = 0;
  
  for (const [migrationName, targetFunctions] of Object.entries(MIGRATIONS)) {
    console.log(`\n📝 Creating migration: ${migrationName}`);
    
    let migrationContent = generateHeader(migrationName, targetFunctions);
    let foundCount = 0;
    let versionCount = 0;
    
    for (const funcName of targetFunctions) {
      const funcKey = funcName.toLowerCase();
      
      if (functions[funcKey]) {
        const versions = functions[funcKey];
        foundCount++;
        versionCount += versions.length;
        
        if (versions.length > 1) {
          console.log(`  ✅ ${funcName} (${versions.length} versions)`);
        } else {
          console.log(`  ✅ ${funcName}`);
        }
        
        // Add all versions of this function
        versions.forEach((funcDef, idx) => {
          if (versions.length > 1) {
            migrationContent += `-- Version ${idx + 1} of ${versions.length}\n`;
          }
          migrationContent += funcDef + '\n\n';
        });
      } else {
        console.log(`  ⚠️  ${funcName} - NOT FOUND`);
      }
    }
    
    // Write migration file
    const outputFile = path.join(migrationsDir, `${migrationName}.sql`);
    fs.writeFileSync(outputFile, migrationContent);
    console.log(`  💾 Saved: ${outputFile}`);
    console.log(`  📊 Functions: ${foundCount}/${targetFunctions.length} (${versionCount} total versions)`);
    
    totalFunctions += foundCount;
    totalVersions += versionCount;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ EXTRACTION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📊 Total functions extracted: ${totalFunctions}`);
  console.log(`📊 Total function versions: ${totalVersions}`);
  console.log(`📁 Migration files created: ${Object.keys(MIGRATIONS).length}`);
  console.log(`📂 Location: supabase/migrations/`);
  console.log('\n🎯 Next steps:');
  console.log('  1. Review the generated migration files');
  console.log('  2. Test in a fresh Supabase environment');
  console.log('  3. Create a PR for review');
  console.log('');
}

// Run the script
main();

