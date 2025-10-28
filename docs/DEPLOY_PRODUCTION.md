# Production Deployment Guide

This guide provides a comprehensive checklist for deploying the Bannos Cakes Order Management System to production.

## 🚀 Pre-Deployment Checklist

### Environment Variables

Ensure all required environment variables are configured in your production environment:

```bash
# Core Application
VITE_APP_URL=https://your-production-domain.com
VITE_DEV_PORT=3000

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Error Monitoring (Optional)
VITE_SENTRY_DSN=your-sentry-dsn

# Demo/Development Flags (MUST be disabled in production)
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_DEBUG_LOGS=false
```

### Database Migrations

**⚠️ CRITICAL:** Run migrations in the correct order and verify no SQL changes are detected:

```bash
# 1. Verify migration status
supabase migration list

# 2. Apply pending migrations
supabase migration up

# 3. Verify realtime publication (critical for messaging)
supabase sql --file supabase/sql/20250114_verify_realtime_publication.sql
```

**Migration Order:**
1. Core tables (users, roles, permissions)
2. Messaging tables (conversations, messages)
3. Realtime publication verification
4. RLS policies
5. RPC functions

### Realtime Publication Check

Verify that Supabase Realtime is properly configured:

```sql
-- Check publication exists and includes messaging tables
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname='supabase_realtime' 
AND tablename IN ('conversations','messages','conversation_participants');
```

**Expected Result:** Should return rows for all messaging tables.

### Security Guardrails

Verify all security measures are in place:

#### CODEOWNERS Enforcement
- ✅ GitHub branch protection rules enabled
- ✅ Code owner reviews required
- ✅ Stale approval dismissal enabled

#### RPC-Only Database Access
```bash
# Verify no direct database writes in codebase
npm run guard:no-direct-writes

# Expected output: "✅ No direct writes detected."
```

#### Security Audit
```bash
# Run security validation
npm run security:validate

# Verify RPC functions use SECURITY DEFINER
# (See docs/security-audit-report.md for results)
```

### Demo Flags Verification

**CRITICAL:** Ensure all demo/development flags are disabled:

```bash
# Check for any demo flags in production build
grep -r "demo\|debug\|development" dist/ || echo "✅ No demo flags found"

# Verify environment variables
echo "VITE_ENABLE_DEMO_MODE: $VITE_ENABLE_DEMO_MODE"
echo "VITE_ENABLE_DEBUG_LOGS: $VITE_ENABLE_DEBUG_LOGS"
```

## 🏗️ Build & Deploy Process

### 1. Pre-Build Validation

```bash
# Install dependencies
npm ci

# Run security checks
npm run security:validate

# Type checking
npm run type-check

# E2E tests (if configured)
npm run test:e2e
```

### 2. Production Build

```bash
# Build for production
npm run build

# Verify build output
ls -la dist/
```

### 3. Deploy to Production

**For Vercel/Netlify:**
```bash
# Deploy using your preferred method
vercel --prod
# or
netlify deploy --prod
```

**For Traditional Hosting:**
```bash
# Upload dist/ folder to your web server
rsync -av dist/ user@server:/path/to/webroot/
```

## 🔧 Post-Deployment Verification

### 1. Basic Functionality

- [ ] Application loads at production URL
- [ ] Authentication works (sign-in/sign-out)
- [ ] Role-based routing functions correctly
- [ ] No console errors in browser dev tools

### 2. Messaging System

- [ ] Messages can be sent and received
- [ ] Real-time updates work (test with two users)
- [ ] Message history loads correctly
- [ ] Unread count updates properly

### 3. Queue Management

- [ ] Queue table loads and displays orders
- [ ] Mobile responsiveness works (test on tablet/phone)
- [ ] Filtering and search functions
- [ ] Staff assignment features work

### 4. Security Verification

- [ ] No direct database writes possible
- [ ] RLS policies are active
- [ ] All RPC functions use SECURITY DEFINER
- [ ] No demo data or debug features visible

### 5. Performance Check

- [ ] Page load times < 3 seconds
- [ ] No memory leaks in browser
- [ ] Real-time connections stable
- [ ] Error monitoring (Sentry) reporting correctly

## 🚨 Rollback Procedures

### Emergency Rollback

If critical issues are discovered:

```bash
# 1. Revert to previous stable deployment
git checkout <previous-stable-commit>
npm run build
# Redeploy

# 2. Database rollback (if needed)
supabase migration down <migration-number>

# 3. Restore previous environment variables
# Update your hosting platform's env vars
```

### Gradual Rollback

For less critical issues:

```bash
# 1. Disable problematic features via feature flags
# 2. Monitor error rates
# 3. Apply hotfixes as needed
# 4. Full rollback if issues persist
```

## 📊 Monitoring & Alerts

### Error Monitoring (Sentry)

- [ ] Sentry DSN configured
- [ ] Error alerts set up
- [ ] Performance monitoring active
- [ ] Release tracking enabled

### Application Monitoring

- [ ] Uptime monitoring configured
- [ ] Response time alerts set up
- [ ] Database connection monitoring
- [ ] Real-time connection health checks

## 🔒 Security Checklist

### Pre-Production Security Review

- [ ] All secrets stored in environment variables
- [ ] No hardcoded credentials in codebase
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all forms
- [ ] SQL injection protection (RPC-only access)
- [ ] XSS protection enabled

### Post-Deployment Security

- [ ] Security headers configured
- [ ] SSL certificate valid
- [ ] No exposed admin endpoints
- [ ] User permissions properly enforced
- [ ] Audit logs enabled

## 📱 Mobile Responsiveness

### Testing Checklist

- [ ] **iPad (1024×768)**: No horizontal scroll, inputs usable
- [ ] **iPhone (375×667)**: Queue table responsive, messaging works
- [ ] **Android tablet**: All features accessible
- [ ] **Desktop**: Full functionality preserved

### Key Responsive Features

- MessagesPanel: Sidebar collapses appropriately
- QueueTable: Non-critical columns hidden on small screens
- Admin dialogs: Properly sized for mobile
- Navigation: Touch-friendly buttons and links

## 🎯 Success Criteria

### Launch Readiness

- [ ] All tests passing
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Mobile responsiveness verified
- [ ] Error monitoring active
- [ ] Rollback procedures tested
- [ ] Team trained on new features

### Post-Launch Monitoring

- Monitor for 24-48 hours after deployment
- Watch error rates and performance metrics
- Verify all user workflows function correctly
- Confirm real-time features work reliably

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Realtime not working**: Verify publication includes messaging tables
2. **Authentication failures**: Check Supabase URL and keys
3. **Mobile layout issues**: Verify responsive CSS classes
4. **Performance problems**: Check database indexes and query optimization

### Emergency Contacts

- **Technical Lead**: [Your contact info]
- **Database Admin**: [Your contact info]
- **DevOps**: [Your contact info]

### Useful Commands

```bash
# Check application health
curl -f https://your-domain.com/health || echo "Health check failed"

# Verify environment variables
printenv | grep VITE_

# Check database connectivity
supabase status

# View recent logs
supabase logs --level error
```

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Next Review**: After each major deployment