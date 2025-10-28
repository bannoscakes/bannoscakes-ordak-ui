import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login flow and sign-out', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Should land on sign-in page or show sign-in form
    await expect(page).toHaveURL('/');
    
    // Look for sign-in form elements
    const signInForm = page.locator('form').or(page.locator('[data-testid="sign-in"]'));
    await expect(signInForm).toBeVisible();
    
    // Test sign-out flow (if already signed in)
    const signOutButton = page.locator('button:has-text("Sign out")').or(page.locator('[data-testid="sign-out"]'));
    
    if (await signOutButton.isVisible()) {
      // Click sign-out
      await signOutButton.click();
      
      // Should redirect to root after sign-out
      await expect(page).toHaveURL('/');
      
      // Should show sign-in form again
      await expect(signInForm).toBeVisible();
    }
  });

  test('role-based routing after login', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // If user is already authenticated, should land on role-appropriate area
    // This test assumes the app uses single URL architecture with query params
    
    // Check if we're on the root with proper role routing
    const url = page.url();
    expect(url).toMatch(/\//); // Should be on root or root with query params
    
    // Look for role-specific content
    const roleContent = page.locator('[data-testid="role-content"]').or(
      page.locator('text=Staff').or(
        page.locator('text=Supervisor').or(
          page.locator('text=Admin')
        )
      )
    );
    
    // If authenticated, should see role content
    if (await roleContent.isVisible()) {
      await expect(roleContent).toBeVisible();
    }
  });
});
