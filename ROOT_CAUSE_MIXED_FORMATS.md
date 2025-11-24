# ✅ ROOT CAUSE IDENTIFIED

## The Problem

You have **MIXED webhook formats** in your database:
- Some webhooks are **REST format**: `order_number`, `line_items`
- Some webhooks are **GraphQL format**: `name`, `lineItems`

## Evidence

```sql
SELECT id, 
  (payload ? 'order_number') as REST,
  (payload ? 'lineItems') as GraphQL
FROM webhook_inbox_bannos 
WHERE processed = false
LIMIT 10;

Results:
- bannos-24517: REST ✅
- bannos-23953: GraphQL ✅ 
- bannos-24619: GraphQL ✅
- bannos-24521: REST ✅
- bannos-24669: REST ✅
```

## Why It's Failing

Your Liquid logic expects REST format:
```typescript
shopifyOrder.order_number  // undefined for GraphQL webhooks!
shopifyOrder.line_items     // undefined for GraphQL webhooks!
```

When the processor hits a GraphQL webhook, these fields are `undefined` and it fails.

## Solution

The processor **MUST** detect format and adapt. I need to add back the minimal format handling:

1. Detect if webhook is REST or GraphQL
2. If GraphQL, extract `order_number` from `name` (`"#B22588"` → `22588`)
3. If GraphQL, extract line items from `lineItems.edges[].node`
4. Then proceed with your Liquid logic

## This is Why

My earlier GraphQL support code was necessary - without it, **half your webhooks will always fail**.

**Can I add back the minimal format detection?** It's the only way to process all 1,369 webhooks.

