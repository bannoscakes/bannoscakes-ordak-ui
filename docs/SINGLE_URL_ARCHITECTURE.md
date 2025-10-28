# Single URL Architecture

## Overview

This application uses a **single URL architecture** where all users access the same URL (`/`) but see different interfaces based on their role. This eliminates the need for role-specific URLs like `/workspace/staff`, `/workspace/supervisor`, or `/dashboard`.

## ✅ **Current Implementation**

### **URL Structure**
- **All users**: Access `http://localhost:3000/` (or production domain)
- **No role-specific URLs**: No `/workspace/staff`, `/workspace/supervisor`, `/dashboard`
- **Role-based routing**: Interface determined by user role, not URL

### **User Experience**
- **Staff users**: See Staff Workspace interface at `/`
- **Supervisor users**: See Supervisor Workspace interface at `/`
- **Admin users**: See Admin Dashboard interface at `/`
- **All users**: Use the same URL, different interfaces

### **Authentication Flow**
1. User accesses `/`
2. System checks authentication status
3. If not authenticated → Show login screen
4. If authenticated → Show interface based on user role
5. Sign-out → Return to login screen at `/`

## 🚫 **What NOT to Do**

### **❌ Forbidden Patterns**
```typescript
// DON'T: Role-specific URLs
window.history.pushState({}, '', '/workspace/staff');
window.history.pushState({}, '', '/workspace/supervisor');
window.history.pushState({}, '', '/dashboard');

// DON'T: URL-based routing
if (pathname === '/workspace/staff') return <StaffWorkspace />;
if (pathname === '/workspace/supervisor') return <SupervisorWorkspace />;
if (pathname === '/dashboard') return <Dashboard />;
```

### **✅ Correct Patterns**
```typescript
// DO: Single URL with role-based routing
window.history.pushState({}, '', '/');

// DO: Role-based routing
if (user.role === 'Staff') return <StaffWorkspacePage />;
if (user.role === 'Supervisor') return <SupervisorWorkspacePage />;
if (user.role === 'Admin') return <Dashboard />;
```

## 🔒 **Safeguards**

### **1. Tests**
- `src/tests/single-url-architecture.test.tsx` - Prevents regression
- Ensures all users always use root URL `/`
- Validates role-based routing works correctly

### **2. ESLint Rules**
- `.eslintrc.single-url.js` - Prevents hardcoded role-specific URLs
- Catches accidental reintroduction of forbidden patterns
- Enforces single URL architecture

### **3. Code Review Checklist**
- [ ] No hardcoded role-specific URLs
- [ ] All routing based on user role, not URL
- [ ] Sign-out functionality works for all roles
- [ ] Single URL (`/`) used consistently

## 🎯 **Benefits**

1. **Simpler URLs**: Users always access the same URL
2. **Better UX**: No confusion about which URL to use
3. **Easier Maintenance**: Single routing logic
4. **Security**: Role-based access control, not URL-based
5. **Consistent**: Same behavior across all environments

## 🔧 **Implementation Details**

### **App.tsx Structure**
```typescript
function RoleBasedRouter() {
  const { user, signOut } = useAuth();
  
  // Always redirect to root path
  if (!workspace.isRootPath) {
    redirectToRoleLanding(user.role); // Always redirects to '/'
  }
  
  // Route by user role, not URL
  if (user.role === 'Staff') return <StaffWorkspacePage onSignOut={signOut} />;
  if (user.role === 'Supervisor') return <SupervisorWorkspacePage onSignOut={signOut} />;
  if (user.role === 'Admin') return <Dashboard onSignOut={signOut} />;
}
```

### **Sign-Out Implementation**
- All components receive `onSignOut` prop
- Sign-out button available in all interfaces
- After sign-out → Login screen at `/`

## 📝 **Maintenance**

When making changes to routing:
1. **Run tests**: `npm test` to ensure no regression
2. **Check ESLint**: `npm run lint` to catch forbidden patterns
3. **Test all roles**: Verify Staff, Supervisor, and Admin interfaces work
4. **Test sign-out**: Ensure sign-out works from all interfaces
5. **Update docs**: Keep this document current

## 🚨 **Emergency Rollback**

If the single URL architecture breaks:
1. Check `src/App.tsx` for role-based routing logic
2. Verify no role-specific URLs in routing
3. Test sign-out functionality
4. Review recent changes to routing components
5. Consult this documentation for correct patterns

---

**Remember**: The single URL architecture is a core design decision. Any changes that reintroduce role-specific URLs should be carefully reviewed and rejected unless there's a compelling reason to change the architecture.
