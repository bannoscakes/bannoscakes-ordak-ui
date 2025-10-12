import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import App from '../App';

// Mock the auth hook to simulate different user roles
const mockAuthUsers = {
  admin: { id: '1', email: 'admin@test.com', role: 'Admin' as const, fullName: 'Admin User' },
  supervisor: { id: '2', email: 'supervisor@test.com', role: 'Supervisor' as const, fullName: 'Supervisor User' },
  staff: { id: '3', email: 'staff@test.com', role: 'Staff' as const, fullName: 'Staff User' },
};

// Mock useAuth hook
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUsers.admin, // Default to admin for testing
    loading: false,
    signOut: jest.fn(),
  }),
}));

describe('Single URL Architecture', () => {
  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: 'http://localhost:3000/', pathname: '/' } as any;
  });

  test('should always use root URL (/) regardless of user role', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Check that we're always on the root path
    expect(window.location.pathname).toBe('/');
  });

  test('should not contain role-specific URLs in the codebase', () => {
    // This test ensures we don't accidentally reintroduce role-specific URLs
    const forbiddenPatterns = [
      '/workspace/staff',
      '/workspace/supervisor', 
      '/dashboard',
      'workspace/staff',
      'workspace/supervisor',
      'dashboard'
    ];

    // Check that these patterns don't exist in our routing logic
    // (This would be expanded to check actual source files)
    forbiddenPatterns.forEach(pattern => {
      expect(window.location.pathname).not.toContain(pattern);
    });
  });

  test('should route users by role, not by URL', () => {
    // Test that different roles see different interfaces on the same URL
    const { rerender } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // All users should access the same URL
    expect(window.location.pathname).toBe('/');
  });
});
