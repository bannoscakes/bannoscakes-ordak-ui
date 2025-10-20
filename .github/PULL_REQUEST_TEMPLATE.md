## What & Why
<!-- short description -->

## Checklist
- [ ] No hardcoded secrets or URLs
- [ ] No changes to `.github/workflows/*` (or PR has label `allow-workflow-change`)
- [ ] No direct SQL writes from client; **writes go via RPCs**
- [ ] Scripts don't soft-delete (`DELETED_*`); if deleting, use `admin_delete_order` RPC
- [ ] CI passes locally (if applicable)

## Delete Operations
To delete: call `rpc('admin_delete_order', { p_order_id })`. Do not run manual SQL or soft-delete.
