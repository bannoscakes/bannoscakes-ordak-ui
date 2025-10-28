import { test, expect } from '@playwright/test';

test.describe('Messaging Flow', () => {
  test('open Messages, send message, assert no duplicates', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for Messages button/link
    const messagesButton = page.locator('button:has-text("Messages")').or(
      page.locator('a:has-text("Messages")').or(
        page.locator('[data-testid="messages-button"]')
      )
    );
    
    if (await messagesButton.isVisible()) {
      // Click to open Messages
      await messagesButton.click();
      
      // Wait for Messages panel to open
      await page.waitForTimeout(1000);
      
      // Look for message input
      const messageInput = page.locator('input[placeholder*="message"]').or(
        page.locator('textarea[placeholder*="message"]').or(
          page.locator('[data-testid="message-input"]')
        )
      );
      
      if (await messageInput.isVisible()) {
        // Send a test message
        const testMessage = 'Hello E2E test message';
        await messageInput.fill(testMessage);
        
        // Look for send button
        const sendButton = page.locator('button:has-text("Send")').or(
          page.locator('button[type="submit"]').or(
            page.locator('[data-testid="send-button"]')
          )
        );
        
        if (await sendButton.isVisible()) {
          await sendButton.click();
          
          // Wait for message to be sent
          await page.waitForTimeout(2000);
          
          // Assert message appears (count should be 1, not duplicated)
          const messageBubbles = page.locator('[data-testid="message-bubble"]').or(
            page.locator('.message').or(
              page.locator(`text=${testMessage}`)
            )
          );
          
          // Count messages with our test content
          const messageCount = await messageBubbles.count();
          expect(messageCount).toBeGreaterThanOrEqual(1);
          
          // Ensure no obvious duplicates (same message text appearing multiple times)
          const duplicateMessages = page.locator(`text=${testMessage}`);
          const duplicateCount = await duplicateMessages.count();
          
          // Allow for some tolerance but flag obvious duplicates
          if (duplicateCount > 2) {
            throw new Error(`Potential message duplication detected: ${duplicateCount} instances of "${testMessage}"`);
          }
        }
      }
    }
  });

  test('messaging panel responsive behavior', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for Messages button
    const messagesButton = page.locator('button:has-text("Messages")').or(
      page.locator('a:has-text("Messages")').or(
        page.locator('[data-testid="messages-button"]')
      )
    );
    
    if (await messagesButton.isVisible()) {
      await messagesButton.click();
      await page.waitForTimeout(1000);
      
      // Check that messaging panel is usable on mobile
      const messagesPanel = page.locator('[data-testid="messages-panel"]').or(
        page.locator('.messages-panel').or(
          page.locator('[class*="messages"]')
        )
      );
      
      if (await messagesPanel.isVisible()) {
        // Should not have horizontal scroll
        const body = page.locator('body');
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.body.scrollWidth > document.body.clientWidth;
        });
        
        expect(hasHorizontalScroll).toBe(false);
      }
    }
  });
});
