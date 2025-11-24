# Webhook Automation Setup

## Problem

The webhook inbox processor (`process-inbox` Edge Function) needs to run automatically to process webhooks from `webhook_inbox_bannos` and `webhook_inbox_flourlane` tables.

## ❌ **Why NOT pg_cron with hardcoded URLs**

Using pg_cron with hardcoded production URLs/credentials in migrations causes:
1. **Cross-environment contamination** - dev/staging would call production
2. **Broken jobs on key rotation** - hardcoded JWT becomes invalid
3. **Security risk** - credentials committed to version control

## ✅ **Recommended Solution: Supabase Database Webhooks**

Use Supabase's built-in Database Webhooks feature to trigger the Edge Function when new webhooks arrive.

### Setup Steps (Supabase Dashboard)

1. **Go to Database → Webhooks**
2. **Create webhook for Bannos:**
   - Name: `process-bannos-webhooks`
   - Table: `webhook_inbox_bannos`
   - Events: `INSERT`
   - Type: `Supabase Edge Function`
   - Edge Function: `process-inbox`
   - HTTP Request:
     ```json
     {
       "store": "bannos",
       "limit": 10
     }
     ```

3. **Create webhook for Flourlane:**
   - Name: `process-flourlane-webhooks`
   - Table: `webhook_inbox_flourlane`
   - Events: `INSERT`
   - Type: `Supabase Edge Function`
   - Edge Function: `process-inbox`
   - HTTP Request:
     ```json
     {
       "store": "flourlane",
       "limit": 10
     }
     ```

### Benefits
- ✅ No hardcoded credentials
- ✅ Environment-specific (each environment has its own webhooks)
- ✅ Triggers immediately on new webhook
- ✅ No cross-environment contamination
- ✅ Managed in Supabase Dashboard, not code

## Alternative: Manual Cron (For Existing Backlog)

For processing the existing backlog of 1,141 webhooks, use a temporary manual approach:

### Option 1: Local Script
Create a local script that calls the Edge Function periodically:

```bash
#!/bin/bash
# scripts/process-webhook-backlog.sh

while true; do
  echo "Processing Bannos..."
  curl -s "https://iwavciibrspfjezujydc.supabase.co/functions/v1/process-inbox" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"store": "bannos", "limit": 100}'
  
  echo "Processing Flourlane..."
  curl -s "https://iwavciibrspfjezujydc.supabase.co/functions/v1/process-inbox" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"store": "flourlane", "limit": 100}'
  
  echo "Waiting 5 minutes..."
  sleep 300
done
```

### Option 2: GitHub Actions (Scheduled Workflow)

Create `.github/workflows/process-webhooks.yml`:

```yaml
name: Process Webhook Backlog

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Process Bannos Webhooks
        run: |
          curl -s "${{ secrets.SUPABASE_URL }}/functions/v1/process-inbox" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"store": "bannos", "limit": 100}'
      
      - name: Process Flourlane Webhooks
        run: |
          curl -s "${{ secrets.SUPABASE_URL }}/functions/v1/process-inbox" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"store": "flourlane", "limit": 100}'
```

## Current Status

**Backlog:**
- Bannos: 454 unprocessed webhooks
- Flourlane: 687 unprocessed webhooks
- Total: 1,141 webhooks

**Recommendation:**
1. Set up Database Webhooks in Supabase Dashboard (for future webhooks)
2. Run manual backlog processing script until backlog is cleared
3. Once backlog is cleared, Database Webhooks will handle all new orders automatically

## Testing

Check unprocessed webhooks:
```sql
SELECT 
  'bannos' as store, COUNT(*) as unprocessed 
FROM webhook_inbox_bannos WHERE processed = false
UNION ALL
SELECT 'flourlane', COUNT(*) 
FROM webhook_inbox_flourlane WHERE processed = false;
```

Check recent orders:
```sql
SELECT COUNT(*) as recent_orders 
FROM orders_bannos 
WHERE created_at > NOW() - INTERVAL '10 minutes';
```
