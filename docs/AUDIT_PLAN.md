# Audit Plan - Feature-Complete Beta
**Audit Date:** 2025-01-14  
**Current Version:** v0.8.0-beta  
**Target:** v1.0.0-beta (Feature Complete)  
**Audited By:** Development Team

**Rollback Plan:** If critical issues arise, revert PR #86 (SHA 80c4e49) to restore last stable messaging/auth state.

---

## Executive Summary

This audit examines the codebase to identify gaps preventing "feature-complete beta" status. The system is currently ~85% complete with solid core functionality. This plan focuses on production readiness, error handling, monitoring, and remaining polish work.

**Audit Scope:**
- Messaging system (UI/hooks/optimistic/realtime/unread)
- Role routing & guards (single URL architecture)
- Admin dialog vs inline renders
- Supabase surface (tables, RPCs, RLS, realtime publications)
- Migrations order & idempotency
- Tests (unit/E2E), CI guards
- Environment & dev server configuration

**Key Constraints:**
- ✅ AUTH_SYSTEM_LOCKED.md respected - no modifications to auth system
- ✅ Read-only audit - no code changes in this document
- ✅ All tasks are one-PR sized (<4 hours, ≤5 files)

---

## Findings

### Severity Definitions
- **P1:** Blocks release or core operations (error monitoring, mobile support, performance)
- **P2:** Important for beta quality (tests, documentation, security validation)
- **P3:** Polish and optimization (UX improvements, minor bugs)

| Area | Issue | Evidence (file+line/PR) | Severity | Fix Type | Fixed by PR # |
|------|-------|-------------------------|----------|----------|---------------|
| **Error Monitoring** | No centralized error tracking system | No Sentry/monitoring integration found | P1 | Integration | __ |
| **Messaging - Realtime** | Realtime publication not verified in migrations | `supabase/sql/20241008_fix_messaging_system_final.sql` drops/recreates but doesn't verify publication | P2 | Migration | __ |
| **Messaging - UI** | Conversation list may not update on new participant join | `src/components/MainDashboardMessaging.tsx:119` - only refreshes on new message | P2 | UI | __ |
| **Role Guards** | No centralized role guard validation test | Tests exist for single URL but not for role-based RPC access | P2 | Tests | __ |
| **Admin Dialog** | Dialog sizing may clip content on small screens | `src/components/admin/AdminMessagingDialog.tsx:14` - fixed viewport sizing | P2 | UI | __ |
| **RPC Client** | RPC error handling uses generic error codes | `src/lib/rpc-client.ts:80-116` - some errors map to generic SYS002 | P2 | Refactor | __ |
| **Mobile Support** | No mobile testing documented or conducted | No mobile test reports found | P1 | Tests | __ |
| **CODEOWNERS** | No CODEOWNERS file to protect critical files | Root directory missing CODEOWNERS | P2 | Docs | __ |
| **E2E Tests** | No end-to-end test suite | Only unit tests in `src/tests/` and `src/features/messages/__tests__/` | P2 | Tests | __ |
| **Environment** | .env.example missing from root | No .env.example file found at root | P2 | Docs | __ (Task 7) |
| **Performance** | No performance monitoring or metrics | No APM tooling integrated | P1 | Integration | __ |
| **Migrations** | Migration order not strictly enforced | Migrations use timestamp prefix but no validation script | P2 | Migration | __ |
| **Shopify** | Only placeholder RPCs exist | `src/lib/rpc-client.ts` - functions exist but don't call real API | P2 | Integration | __ |
| **Realtime Publications** | No health check for realtime publication | Service health check may fail in fresh environments | P2 | Migration | __ |
| **Optimistic Updates** | Optimistic message cleanup on unmount not verified | `src/components/MainDashboardMessaging.tsx` - may leave orphan messages | P3 | UI | __ |
| **Unread Count** | Unread count calculation includes own messages briefly | Race condition between send and mark_read | P3 | RPC | __ |

---

## Task List (One-PR Each)

### Task 1: Add Sentry Error Monitoring Integration
**Title:** `feat: integrate Sentry for error monitoring and alerting`  
**Owner:** Backend Team

**Rationale:** Production systems require centralized error tracking. Currently, errors are only logged to console, making production debugging difficult.

**Acceptance Criteria:**
- [ ] Sentry SDK installed and configured
- [ ] ErrorBoundary reports to Sentry
- [ ] User context (role, user_id) attached to errors
- [ ] Environment filtering (dev errors filtered out)
- [ ] Correlation IDs attached to all error reports
- [ ] Source maps uploaded for production debugging
- [ ] Tested with intentional error

**Files to Touch:**
1. `package.json` - Add @sentry/react dependency
2. `src/lib/error-monitoring.ts` (new) - Sentry initialization
3. `src/components/ErrorBoundary.tsx` - Add Sentry.captureException
4. `src/lib/error-handler.ts` - Add Sentry context
5. `.env.example` - Add VITE_SENTRY_DSN

**Estimate:** 3 hours

**Dependencies:** None

**Risk:** Low - Sentry integration is well-documented and non-breaking

---

### Task 2: Create CODEOWNERS File
**Title:** `chore: add CODEOWNERS to protect critical files`  
**Owner:** DevOps Team

**Rationale:** Prevent accidental modifications to locked files (auth system, single URL architecture, RPC client). Enforces code review requirements.

**Acceptance Criteria:**
- [ ] CODEOWNERS file created at root
- [ ] Auth system files assigned to @architecture-team
- [ ] RPC client assigned to @backend-team
- [ ] Critical migrations assigned to @database-team
- [ ] Single URL architecture files assigned to @architecture-team
- [ ] File format validated (GitHub CODEOWNERS syntax)

**Files to Touch:**
1. `CODEOWNERS` (new) - Define ownership rules

**Estimate:** 1 hour

**Dependencies:** None

**Risk:** Very Low - Documentation only

---

### Task 3: Add Realtime Publication Health Check Migration
**Title:** `feat(migration): verify realtime publication for messaging`  
**Owner:** Database Team  
**Migration File:** `supabase/sql/20250114_verify_realtime_publication.sql` (idempotent)

**Rationale:** Messaging system relies on realtime publication. Fresh Supabase environments may not have this configured, causing "Service health check failed" errors.

**Acceptance Criteria:**
- [ ] Migration checks if realtime publication exists
- [ ] Creates publication if missing (idempotent)
- [ ] Verifies conversations and messages tables included
- [ ] Idempotent (safe to run multiple times)
- [ ] Logs publication status
- [ ] Tested in fresh Supabase environment

**Files to Touch:**
1. `supabase/sql/20250114_verify_realtime_publication.sql` (new)
2. `docs/migration-order.md` - Document new migration

**Estimate:** 2 hours

**Dependencies:** None

**Risk:** Low - Read-only verification, create if missing

---

### Task 4: Add RPC Security Audit Tests
**Title:** `test: add comprehensive RPC security validation tests`  
**Owner:** QA Team

**Rationale:** Ensure all RPCs have proper SECURITY DEFINER, role guards, and input sanitization. Currently no automated verification.

**Acceptance Criteria:**
- [ ] Test verifies all RPCs use SECURITY DEFINER
- [ ] Test verifies role guards on restricted operations
- [ ] Test verifies unauthorized access fails gracefully
- [ ] Test covers Admin-only, Supervisor-only, and Staff operations
- [ ] Test suite runs in CI
- [ ] Documentation updated with security test results

**Files to Touch:**
1. `src/tests/rpc-security.test.ts` (new)
2. `docs/security-audit-report.md` (new)
3. `package.json` - Add test script if needed

**Estimate:** 4 hours

**Dependencies:** Task 1 (for error reporting)

**Risk:** Medium - Requires Supabase connection and test data setup

---

### Task 5: Add Performance Monitoring
**Title:** `feat: add performance monitoring for RPCs and queue operations`  
**Owner:** Backend Team

**Rationale:** No visibility into RPC call duration or UI rendering performance. Need metrics to identify bottlenecks before production.

**Acceptance Criteria:**
- [ ] RPC call duration logged in development
- [ ] Long-running operations flagged (>500ms)
- [ ] Queue render performance tracked
- [ ] Performance data available in DevTools
- [ ] Optional: Web Vitals tracking
- [ ] Performance metrics documented

**Files to Touch:**
1. `src/lib/performance-monitor.ts` (new)
2. `src/lib/rpc-client.ts` - Add performance tracking wrapper
3. `src/components/QueueTable.tsx` - Add render metrics

**Estimate:** 3 hours

**Dependencies:** Task 1 (for error reporting)

**Risk:** Low - Development-only feature initially

---

### Task 6: Mobile Responsiveness Audit & Fixes
**Title:** `fix: mobile responsiveness for messaging and queue components`  
**Owner:** Frontend Team

**Rationale:** No mobile testing conducted. App may have layout issues, touch interaction problems, or scanner failures on mobile devices.

**Acceptance Criteria:**
- [ ] Tested on iOS Safari (iPhone 12+)
- [ ] Tested on Android Chrome (Pixel 6+)
- [ ] Touch interactions work (scroll, tap, swipe)
- [ ] Scanner works on mobile camera
- [ ] No horizontal scroll
- [ ] Modals/dialogs mobile-friendly
- [ ] Test report documented

**Files to Touch:**
1. `src/components/MainDashboardMessaging.tsx` - Responsive fixes
2. `src/components/QueueTable.tsx` - Mobile table layout
3. `src/components/Scanner.tsx` - Mobile camera fixes
4. `docs/mobile-testing-report.md` (new)

**Estimate:** 4 hours

**Dependencies:** None

**Risk:** Medium - May uncover significant mobile issues requiring more work

---

### Task 7: Create Comprehensive Environment Documentation
**Title:** `docs: create .env.example and update environment documentation`  
**Owner:** DevOps Team  
**Note:** Template content defined in PROJECT_STATUS.md - needs creation at root

**Rationale:** New developers and deployment teams need clear guidance on required variables.

**Acceptance Criteria:**
- [ ] .env.example created at root with VITE_APP_URL=http://localhost:3000, VITE_DEV_PORT=3000
- [ ] Demo flags set to empty/false
- [ ] All VITE_* variables included
- [ ] Comments explain each variable's purpose
- [ ] Default values for development provided
- [ ] Production requirements clearly marked
- [ ] Links to setup guides included
- [ ] README.md updated with environment setup section

**Files to Touch:**
1. `.env.example` (new at root)
2. `docs/environment.md` - Update with new variables
3. `README.md` - Add environment setup section

**Estimate:** 1-2 hours

**Dependencies:** None

**Risk:** Very Low - Documentation only

---

### Task 8: Add Messaging Component Unit Tests
**Title:** `test: add unit tests for messaging components and hooks`  
**Owner:** QA Team

**Rationale:** Messaging system has limited test coverage. Need tests for optimistic updates, realtime handling, and conversation management.

**Acceptance Criteria:**
- [ ] MainDashboardMessaging component tests
- [ ] useRealtimeMessages hook tests
- [ ] Optimistic message reconciliation tests
- [ ] Conversation creation tests
- [ ] Error handling tests
- [ ] All tests passing
- [ ] Test coverage report generated

**Files to Touch:**
1. `src/components/__tests__/MainDashboardMessaging.test.tsx` (new)
2. `src/hooks/__tests__/useRealtimeMessages.test.ts` (new)
3. `package.json` - Add testing-library dependencies if needed

**Estimate:** 4 hours

**Dependencies:** None

**Risk:** Low - Standard React Testing Library tests

---

### Task 9: Fix Admin Messaging Dialog Sizing
**Title:** `fix: improve admin messaging dialog responsive sizing`  
**Owner:** Frontend Team

**Rationale:** Dialog uses fixed viewport sizing (w-[92vw], h-[80vh]) which may clip content on small screens or ultrawide monitors.

**Acceptance Criteria:**
- [ ] Dialog uses responsive sizing (min/max constraints)
- [ ] Content doesn't clip on screens <1024px
- [ ] Scrollable content areas work properly
- [ ] Tested on 1920x1080, 1366x768, and 320x568 (mobile)
- [ ] Visual regression test added

**Files to Touch:**
1. `src/components/admin/AdminMessagingDialog.tsx`
2. `src/components/MainDashboardMessaging.tsx` (if layout changes needed)

**Estimate:** 2 hours

**Dependencies:** Task 6 (mobile testing)

**Risk:** Low - CSS-only changes

---

### Task 10: Add Migration Order Validation Script
**Title:** `chore: add migration order validation script`  
**Owner:** DevOps Team

**Rationale:** Migrations use timestamp prefix but no script validates order. Risk of applying migrations out of order in fresh environments.

**Acceptance Criteria:**
- [ ] Script reads all migration files
- [ ] Validates timestamp order
- [ ] Checks for duplicate timestamps
- [ ] Verifies filename format
- [ ] Runs in CI pipeline
- [ ] Documentation updated

**Files to Touch:**
1. `scripts/validate-migrations.sh` (new)
2. `package.json` - Add migration validation script
3. `docs/migration-order.md` - Document validation process

**Estimate:** 2 hours

**Dependencies:** None

**Risk:** Low - Read-only validation script

---

### Task 11: Improve Conversation List Updates
**Title:** `fix: update conversation list on participant join/leave`  
**Owner:** Frontend Team

**Rationale:** Conversation list only refreshes on new message, not on participant changes. Users may not see updated participant counts.

**Acceptance Criteria:**
- [ ] Realtime listener for conversation_participants table
- [ ] Conversation list updates on participant join
- [ ] Conversation list updates on participant leave
- [ ] No excessive re-renders
- [ ] Tested with multiple users

**Files to Touch:**
1. `src/components/MainDashboardMessaging.tsx`
2. `src/hooks/useRealtimeMessages.ts`

**Estimate:** 2 hours

**Dependencies:** None

**Risk:** Low - Uses existing realtime patterns

---

### Task 12: Add Shopify Webhook Implementation (Phase 1)
**Title:** `feat: implement Shopify webhook endpoint for order creation`  
**Owner:** Backend Team

**Rationale:** Shopify integration currently has placeholder RPCs. Need real webhook implementation for order automation.

**Acceptance Criteria:**
- [ ] Edge function receives webhook POST
- [ ] HMAC signature verification working
- [ ] Order ingestion RPC called successfully
- [ ] Error handling for malformed payloads
- [ ] Retry logic for failed ingestions
- [ ] Logging for debugging
- [ ] Tested with Shopify test environment

**Files to Touch:**
1. `supabase/functions/orders_create_bannos/index.ts`
2. `supabase/functions/orders_create_flourlane/index.ts`
3. `supabase/functions/_shared/hmac.ts`
4. `docs/webhook-ingest.md`

**Estimate:** 4 hours

**Dependencies:** None (can be done in isolation)

**Risk:** Medium - Requires Shopify API knowledge and test account

---

### Task 13: Add E2E Test Foundation
**Title:** `test: add basic E2E test suite with Playwright`  
**Owner:** QA Team

**Rationale:** No E2E tests exist. Need automated testing for critical user flows (login, create order, messaging).

**Acceptance Criteria:**
- [ ] Playwright installed and configured
- [ ] Test: User login flow
- [ ] Test: Create order flow
- [ ] Test: Send message flow
- [ ] Test: Scanner flow (with mock camera)
- [ ] Tests run in CI
- [ ] Documentation updated

**Files to Touch:**
1. `package.json` - Add Playwright
2. `playwright.config.ts` (new)
3. `tests/e2e/auth.spec.ts` (new)
4. `tests/e2e/orders.spec.ts` (new)
5. `tests/e2e/messaging.spec.ts` (new)

**Estimate:** 4 hours (foundation only, more tests to follow)

**Dependencies:** None

**Risk:** Medium - Requires test environment setup and fixture data

---

### Task 14: Add Production Deployment Checklist
**Title:** `docs: create comprehensive production deployment checklist`  
**Owner:** DevOps Team

**Rationale:** No documented deployment process. Need checklist to ensure all steps completed before production launch.

**Acceptance Criteria:**
- [ ] Environment variables checklist
- [ ] Database migration checklist
- [ ] Realtime configuration checklist
- [ ] Security checklist (RLS, CORS, rate limits)
- [ ] Monitoring setup checklist (Sentry, logs)
- [ ] Performance testing checklist
- [ ] Rollback plan documented
- [ ] Post-deployment verification steps

**Files to Touch:**
1. `docs/DEPLOY_PRODUCTION.md` - Update with comprehensive checklist
2. `docs/runbook.md` - Add deployment section

**Estimate:** 2 hours

**Dependencies:** Tasks 1, 3, 7 (incorporate their requirements)

**Risk:** Very Low - Documentation only

---

## Validation Matrix

| Task | Test to Add/Run | Expected Outcome |
|------|----------------|------------------|
| **Task 1** | Trigger error in ErrorBoundary | Error reported to Sentry dashboard with user context |
| **Task 2** | Attempt to modify locked file without approval | GitHub requires CODEOWNERS approval |
| **Task 3** | Run migration in fresh Supabase | Publication created, no errors |
| **Task 4** | Run `npm run test:security` | All security tests pass |
| **Task 5** | Load queue with 100+ orders | Performance metrics logged, no operations >500ms |
| **Task 6** | Open app on iPhone Safari | All components render properly, no horizontal scroll |
| **Task 7** | New developer setup | Can run app using .env.example as template |
| **Task 8** | Run `npm test` | Messaging tests pass with >80% coverage |
| **Task 9** | Open admin dialog on 1366x768 screen | No content clipping, proper scrolling |
| **Task 10** | Run `npm run validate:migrations` | All migrations validated, no errors |
| **Task 11** | Add user to conversation | Participant count updates without page refresh |
| **Task 12** | Send test webhook from Shopify | Order created in database |
| **Task 13** | Run `npm run test:e2e` | All E2E tests pass |
| **Task 14** | Follow deployment checklist | Successful production deployment |

---

## Merge Order

Execute tasks in the following sequence to minimize dependencies and risk:

### Phase 1: Foundation & Monitoring (Week 1)
1. **Task 2** - CODEOWNERS (1h) - Immediate protection
2. **Task 7** - Environment Docs (2h) - Unblocks deployment planning
3. **Task 1** - Sentry Integration (3h) - Critical for production
4. **Task 10** - Migration Validation (2h) - Prevents migration issues

### Phase 2: Database & Realtime (Week 1-2)
5. **Task 3** - Realtime Publication Check (2h) - Fixes messaging in fresh envs
6. **Task 4** - RPC Security Tests (4h) - Critical security validation

### Phase 3: Performance & Testing (Week 2)
7. **Task 5** - Performance Monitoring (3h) - Visibility into bottlenecks
8. **Task 8** - Messaging Unit Tests (4h) - Increase test coverage

### Phase 4: UI/UX Improvements (Week 2-3)
9. **Task 6** - Mobile Responsiveness (4h) - Critical for usability
10. **Task 9** - Admin Dialog Sizing (2h) - Polish
11. **Task 11** - Conversation Updates (2h) - UX improvement

### Phase 5: Integration & Deployment (Week 3)
12. **Task 13** - E2E Test Foundation (4h) - Automated testing
13. **Task 12** - Shopify Webhooks (4h) - Order automation (optional for beta)
14. **Task 14** - Deployment Checklist (2h) - Final prep

**Total Estimated Time:** 39 hours (~1 week with 2 developers)

**Critical Path:** Tasks 1, 2, 3, 4, 6, 14 (minimum for production)

**Optional for v1.0 Beta:** Tasks 12 (Shopify - can be v1.1)

---

## Post-Audit Recommendations

### Immediate Actions (This Week)
1. Create CODEOWNERS file (Task 2)
2. Add .env.example documentation (Task 7)
3. Integrate Sentry for error monitoring (Task 1)

### Short-Term Actions (Next 2 Weeks)
4. Run RPC security audit (Task 4)
5. Test on mobile devices (Task 6)
6. Add performance monitoring (Task 5)

### Medium-Term Actions (Next Month)
7. Implement Shopify webhooks (Task 12)
8. Build E2E test suite (Task 13)
9. Increase unit test coverage (Task 8)

### Continuous Improvements
- Monitor error rates via Sentry
- Track performance metrics
- Expand E2E test coverage
- Document production incidents

---

## Constraint Compliance

### AUTH_SYSTEM_LOCKED.md Respected ✅
No tasks modify any locked auth files:
- ❌ src/lib/auth.ts
- ❌ src/contexts/AuthContext.tsx
- ❌ src/hooks/useAuth.ts
- ❌ src/App.tsx
- ❌ vite.config.ts
- ❌ package.json (except adding non-breaking dependencies)

### Task Size Constraints ✅
All tasks meet requirements:
- ✅ <4 hours estimate each
- ✅ ≤5 files touched each
- ✅ One PR per task
- ✅ Clear acceptance criteria
- ✅ Minimal dependencies

### Read-Only Audit ✅
This document proposes changes but makes none:
- ✅ No code modifications
- ✅ No file edits
- ✅ Documentation only

---

## Success Criteria

**Feature-Complete Beta (v1.0.0-beta) is achieved when:**

- [ ] All P1 severity findings resolved (Tasks 1, 6)
- [ ] All P2 security findings resolved (Tasks 3, 4)
- [ ] Mobile responsiveness verified (Task 6)
- [ ] Error monitoring active (Task 1)
- [ ] Deployment checklist complete (Task 14)
- [ ] CODEOWNERS protection active (Task 2)
- [ ] Environment documentation complete (Task 7)
- [ ] Core flows tested (manual or E2E)

**Optional for v1.0 (can be v1.1):**
- Shopify webhook integration (Task 12)
- Full E2E test suite (Task 13)
- 80%+ test coverage (Task 8)

---

## Notes for Development Team

1. **Prioritize P1 Tasks:** Error monitoring and mobile testing are critical for production
2. **Auth System Locked:** Respect AUTH_SYSTEM_LOCKED.md - no modifications without architectural review
3. **One PR Per Task:** Keep PRs focused and reviewable
4. **Test Everything:** Each task includes acceptance criteria - verify before merging
5. **Document as You Go:** Update docs alongside code changes
6. **Ask Questions:** If task scope unclear, ask before starting

**Questions?** Contact @architecture-team or @backend-team on Slack.

