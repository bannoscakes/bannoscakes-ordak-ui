# Pre-End-to-End Testing Tasks

**Created:** 2025-01-30  
**Status:** In Progress  
**Priority:** Critical tasks before E2E testing

Based on review of `checklists.md` and current system status, these are the essential tasks that must be completed before end-to-end testing can begin.

---

## 🚨 **Critical Missing Components**

### **1. Error Boundaries & Error Handling**
- [ ] Add error boundaries to critical routes/components
- [ ] Implement error recovery mechanisms
- [ ] Add user-friendly error messages
- [ ] Test error scenarios (network failures, invalid data)
- [ ] Implement structured error codes (ORD001, INV001, AUTH001, etc.)
- [ ] Add error logging with correlation IDs and duration tracking
- [ ] Create error recovery flows for failed webhooks and inventory sync

### **2. RLS/RPC Security Validation**
- [ ] Verify no direct table writes from client (RPC-only access)
- [ ] Confirm all RPCs have proper role guards and are SECURITY DEFINER
- [ ] Test RLS policies: authenticated users can select but not insert/update/delete
- [ ] Validate input sanitization on all RPC parameters
- [ ] Ensure service role keys are never shipped in client bundle
- [ ] Test role-based access control for all operations

### **3. Data Validation & Constraints**
- [ ] Verify foreign keys have proper ON DELETE rules
- [ ] Confirm unique constraints prevent duplicates
- [ ] Test check constraints for business rules
- [ ] Ensure `updated_at` triggers are consistent
- [ ] Validate stage transitions are properly constrained
- [ ] Confirm inventory cannot go negative
- [ ] Test idempotency for all RPC operations
- [ ] Validate stage transition logic (Filling → Covering → Decorating → Packing → Complete)

---

## 🔧 **System Integration Tasks**

### **4. Internal Messaging System**
- [ ] Implement messaging UI components
- [ ] Wire messaging to database RPCs
- [ ] Add real-time messaging capabilities
- [ ] Test message persistence and retrieval
- [ ] Add message notifications/alerts
- [ ] Create `conversations`, `conversation_participants`, `messages` tables with RLS
- [ ] Implement unread count tracking by `(conversation_id, created_at desc)`

### **5. Performance Optimization & Monitoring**
- [ ] Optimize database queries (add indexes where needed)
- [ ] Implement data caching strategies
- [ ] Optimize component rendering (memoization)
- [ ] Test with larger datasets
- [ ] Monitor memory usage and cleanup
- [ ] Set up performance monitoring (Queue p95 < 200ms, Order creation p95 < 500ms)
- [ ] Implement structured timings `{route, t_ms, ok}` for Edge functions
- [ ] Set up `api_logs` table for percentiles and performance tracking

### **6. Mobile Responsiveness**
- [ ] Test all components on mobile devices
- [ ] Optimize touch interactions
- [ ] Ensure scanner works on mobile
- [ ] Test responsive layouts
- [ ] Validate mobile navigation

---

## 🛡️ **Security & Validation**

### **7. Security Review**
- [ ] Confirm no service role keys in client bundle
- [ ] Verify all secrets use proper environment variables
- [ ] Test HMAC verification (when webhooks are implemented)
- [ ] Validate admin operations require explicit role checks
- [ ] Review input validation on all forms
- [ ] Ensure RLS is enabled on all tables
- [ ] Test SQL injection mitigation (parameterized queries)
- [ ] Validate signed URLs for media (no public buckets)

### **8. Environment Configuration**
- [ ] Verify `.env` differences between dev/staging/prod
- [ ] Confirm only `VITE_*` variables in frontend
- [ ] Test environment-specific configurations
- [ ] Validate Supabase client uses anon key only
- [ ] Set up proper environment variables for Edge Functions
- [ ] Configure Shopify webhook secrets and tokens
- [ ] Set up monitoring tools (Sentry, PostHog) environment variables

---

## 📊 **Data & Migration Tasks**

### **9. Migration Testing & Database Schema**
- [ ] Test `npx supabase migration up` on fresh database
- [ ] Verify all migrations apply cleanly
- [ ] Test rollback procedures
- [ ] Document migration dependencies
- [ ] Validate data integrity after migrations
- [ ] Verify M0-M8 migration sequence is complete
- [ ] Test zero-downtime migrations (nullable → backfill → NOT NULL)
- [ ] Validate enum additions with `alter type ... add value`
- [ ] Test idempotent SQL operations

### **10. Test Data Management & Seed Data**
- [ ] Create comprehensive test data sets
- [ ] Test with realistic data volumes
- [ ] Validate data relationships
- [ ] Test edge cases and boundary conditions
- [ ] Create data cleanup procedures
- [ ] Create `seed_dev.sql` for development (never run in staging/prod)
- [ ] Include minimal staff rows, 1-2 inventory items, one fake order per store
- [ ] Test with both `orders_bannos` and `orders_flourlane` data

---

## 🔍 **Component Validation**

### **11. UI Component Testing**
- [ ] Test all form validations
- [ ] Verify all buttons and interactions work
- [ ] Test loading states and error states
- [ ] Validate accessibility features
- [ ] Test keyboard navigation
- [ ] Test stage transition UI (Filling → Covering → Decorating → Packing → Complete)
- [ ] Validate assignment UI (assignee_id IS NULL logic)
- [ ] Test QC return functionality

### **12. Integration Points & RPC Validation**
- [ ] Test all RPC function calls
- [ ] Verify data persistence across components
- [ ] Test real-time updates
- [ ] Validate cross-component data flow
- [ ] Test component communication
- [ ] Validate all SECURITY DEFINER RPCs work correctly
- [ ] Test role-based access for all RPC operations
- [ ] Verify idempotency for all stage completion RPCs

---

## 📋 **Documentation & Monitoring**

### **13. Documentation Updates**
- [ ] Update API documentation
- [ ] Document all RPC functions
- [ ] Create user guides
- [ ] Document deployment procedures
- [ ] Update troubleshooting guides
- [ ] Document error codes and recovery procedures
- [ ] Create Dev Change Report template
- [ ] Document rollback strategies

### **14. Monitoring Setup & Health Checks**
- [ ] Set up error tracking (Sentry)
- [ ] Configure performance monitoring
- [ ] Set up alerting for critical issues
- [ ] Create dashboards for key metrics
- [ ] Test monitoring and alerting
- [ ] Set up health check endpoints (`GET /api/health`)
- [ ] Configure Slack alerts for thresholds
- [ ] Set up daily health check procedures
- [ ] Monitor queue depth, error rates, and performance metrics

---

## 🎯 **Priority Order**

### **Phase 1: Critical Security & Validation (Must Complete First)**
1. Error Boundaries & Error Handling
2. RLS/RPC Security Validation
3. Data Validation & Constraints
4. Security Review

### **Phase 2: Core Functionality (Before E2E Testing)**
5. Internal Messaging System
6. Performance Optimization & Monitoring
7. Migration Testing & Database Schema
8. Component Validation

### **Phase 3: Polish & Monitoring (Can be done in parallel)**
9. Mobile Responsiveness
10. Test Data Management & Seed Data
11. Documentation Updates
12. Monitoring Setup & Health Checks

---

## ✅ **Completion Criteria**

Before end-to-end testing can begin:
- [ ] All Phase 1 tasks completed
- [ ] All Phase 2 tasks completed
- [ ] No critical security vulnerabilities
- [ ] All core components functional
- [ ] Error handling implemented
- [ ] Performance acceptable

---

## 📝 **Notes**

- **Shopify Integration** and **Webhook Setup** are intentionally left for later as requested
- **Internal Messaging** is prioritized as it's a core feature that can be implemented now
- Focus on **quality over speed** - better to have fewer features working perfectly
- Each task should be tested individually before moving to the next
- Document any issues or blockers encountered during implementation

### **Key Requirements from Documentation Review:**
- **Stage Model**: Filling → Covering → Decorating → Packing → Complete (no extra stage tables)
- **Unassigned Logic**: `assignee_id IS NULL` for current stage
- **RPC-Only Writes**: All mutations via SECURITY DEFINER RPCs with role checks
- **Idempotency**: All stage completion operations must be idempotent
- **Performance Targets**: Queue p95 < 200ms, Order creation p95 < 500ms
- **Error Handling**: Structured error codes, correlation IDs, recovery flows
- **Migration Strategy**: Zero-downtime migrations, proper rollback procedures

### **Critical Missing from Current System:**
- Error boundaries and structured error handling
- Comprehensive RLS/RPC security validation
- Performance monitoring and health checks
- Proper migration testing and rollback procedures
- Internal messaging system with real-time capabilities

### **Branch Strategy for Completed Work:**
Based on the RPC Implementation Plan, we can create separate branches for completed work:

#### **Ready for Branch Creation:**
1. **`feat/authentication-complete`** - Authentication & RBAC system
2. **`feat/inventory-ui-complete`** - Inventory management UI integration
3. **`feat/settings-ui-complete`** - Settings management UI integration
4. **`feat/scanner-integration-complete`** - Scanner and barcode integration
5. **`feat/order-management-complete`** - Order editing and management UI

#### **Branch Creation Process:**
1. Create feature branch from current `feature/inventory-ui-integration`
2. Test all functionality thoroughly
3. Create pull request for review
4. Merge to `dev` branch after approval
5. Tag release version

### **Vertical Slices Status:**
From `vertical-slices.md`, we have completed:
- **Slice 0**: Auth & Roles ✅
- **Slice 2**: Queues & All Stages ✅ (partially)
- **Slice 3**: Scanner & Barcode ✅
- **Slice 6**: Settings ✅

Still needed:
- **Slice 12**: Messaging (Internal messaging system)
- **Slice 15**: Monitoring & Error Handling

---

**Next Step:** Start with **Error Boundaries & Error Handling** as it's the most critical missing component for system stability.
