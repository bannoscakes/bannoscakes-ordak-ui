  +# Task Splitting for Multi‑Cake Orders

This document describes how the new Ordak system splits orders containing
multiple cakes into separate kitchen tasks after ingestion. Splitting
is no longer part of the webhook ingestion; it is performed at the
task‑generation stage to keep ingestion simple, idempotent and consistent
across both Bannos and Flour Lane stores.

## Why split after ingestion?

Orders can contain multiple cake line items with different flavours or
decorations that need to be assigned to different staff or stations.

Splitting tasks at assignment time (rather than duplicating orders in
the database) avoids mixing data across stores and keeps the webhook
logic simple and easy to maintain.

Accessories such as candles, balloons or toppers are associated
exclusively with the first cake ticket, matching the original
docket behaviour.

## Splitting rules

Identify cake items: Iterate over the line items in the
normalised order. For each line item representing a cake with
quantity > 0, create a separate task entry for each unit (i.e. a
quantity of two generates two tasks).

Assign suffixes: Assign alphabetical suffixes (A, B, C, …)
to each cake task. For example, order B23975 with two cakes
becomes tasks B23975-A and B23975-B. Use a stable ordering so
the first cake always receives suffix A.

Distribute accessories: Collect all non‑cake accessories from
the order (candles, balloons, toppers, etc.). Attach these
accessories only to the first task (A). Subsequent cake
tasks (B, C, …) should have an empty accessories list.

Store tasks: Insert each generated task into a work_queue
(or similar) table, referencing the original order_id and the
specific line_item_id. Include fields such as:

- task_suffix (A, B, …)
- assigned_staff (initially NULL)
- phase (e.g. Filling)
- status (pending, in‑progress, done, etc.)
- accessories (list of accessory items for the first task)
- Other relevant metadata like cake size, flavour, and
  writing extracted from the line item.

## Example algorithm (pseudocode)

```javascript
function generateKitchenTasks(orderId: string) {
  const order = db.orders.get(orderId);
  const cakeItems = [];
  const accessories = [];

  // separate cakes and accessories
  for (const item of order.orderItems) {
    if (isCake(item)) {
      // one task per cake unit
      for (let i = 0; i < item.quantity; i++) {
        cakeItems.push(item);
      }
    } else {
      // collect accessories for the first task
      accessories.push(item);
    }
  }

  const tasks = [];
  for (let i = 0; i < cakeItems.length; i++) {
    const suffix = String.fromCharCode('A'.charCodeAt(0) + i);
    tasks.push({
      orderId: order.id,
      lineItemId: cakeItems[i].id,
      taskSuffix: suffix,
      accessories: i === 0 ? accessories : [],
      size: cakeItems[i].size,
      flavour: cakeItems[i].flavour,
      writing: cakeItems[i].writing,
      phase: 'Filling',
      status: 'pending',
      assignedStaff: null
    });
  }

  db.workQueue.insert(tasks);
}
```

## Summary

Splitting multi‑cake orders into tasks after ingestion preserves a
simple, robust ingest pipeline and ensures each cake can be assigned to
a different staff member or station. Accessories remain associated
with the first ticket (-A), just as they do on your paper dockets.

