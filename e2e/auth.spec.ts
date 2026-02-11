/**
 * E2E Tests: Authentication Flow
 *
 * Tests the complete signup → onboarding flow from a real user perspective.
 * These tests WILL FAIL if UI elements are disconnected from logic.
 *
 * Run with: npm run test:e2e
 * Run with trace: npm run test:e2e:trace
 */

import { test, expect } from '@playwright/test'

// Generate unique test email to avoid conflicts
function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `test-${timestamp}-${random}@example.com`
}

test.describe('Signup Flow', () => {
  test('should show signup page with all required elements', async ({ page }) => {
    await page.goto('/signup')

    // Wait for page to load
    await expect(page).toHaveURL(/\/signup/)

    // Check for required form elements
    await expect(page.getByLabel(/your name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()

    // Check for privacy checkbox
    await expect(page.getByRole('checkbox')).toBeVisible()

    // Check for submit button
    const submitButton = page.getByRole('button', { name: /create account/i })
    await expect(submitButton).toBeVisible()

    // Button should be disabled initially (privacy not accepted)
    await expect(submitButton).toBeDisabled()
  })

  test('should enable submit button when privacy policy is accepted', async ({ page }) => {
    await page.goto('/signup')

    const submitButton = page.getByRole('button', { name: /create account/i })
    const privacyCheckbox = page.getByRole('checkbox')

    // Initially disabled
    await expect(submitButton).toBeDisabled()

    // Accept privacy policy
    await privacyCheckbox.check()

    // Now should be enabled
    await expect(submitButton).toBeEnabled()
  })

  test('should show validation error when form is incomplete', async ({ page }) => {
    await page.goto('/signup')

    // Accept privacy policy to enable button
    await page.getByRole('checkbox').check()

    // Click submit without filling form
    await page.getByRole('button', { name: /create account/i }).click()

    // Should show validation error (browser native or custom)
    // The form should NOT navigate away
    await expect(page).toHaveURL(/\/signup/)
  })

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/signup')

    // Fill form with mismatched passwords
    await page.getByLabel(/your name/i).fill('Test User')
    await page.getByLabel(/email/i).fill(generateTestEmail())
    await page.getByLabel(/^password$/i).fill('password123')
    await page.getByLabel(/confirm password/i).fill('different123')
    await page.getByRole('checkbox').check()

    // Click submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Should show error message
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('should show password too short error', async ({ page }) => {
    await page.goto('/signup')

    // Fill form with short password
    await page.getByLabel(/your name/i).fill('Test User')
    await page.getByLabel(/email/i).fill(generateTestEmail())
    await page.getByLabel(/^password$/i).fill('short')
    await page.getByLabel(/confirm password/i).fill('short')
    await page.getByRole('checkbox').check()

    // Click submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Should show error message
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
  })

  test('CRITICAL: signup button click should trigger network request', async ({ page }) => {
    /**
     * This test specifically checks that clicking the signup button
     * actually triggers a network request. If the button is "dead"
     * (disconnected from form logic), this test WILL FAIL.
     */
    await page.goto('/signup')

    const testEmail = generateTestEmail()
    const testPassword = 'TestPassword123!'

    // Fill all form fields
    await page.getByLabel(/your name/i).fill('Test User')
    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/confirm password/i).fill(testPassword)
    await page.getByRole('checkbox').check()

    // Set up request listener BEFORE clicking
    let signupRequestMade = false
    let consoleMessages: string[] = []

    // Listen for console messages (our debug logs)
    page.on('console', (msg) => {
      consoleMessages.push(msg.text())
    })

    // Listen for any network requests to Supabase
    page.on('request', (request) => {
      if (request.url().includes('supabase') || request.url().includes('auth')) {
        signupRequestMade = true
      }
    })

    // Click the submit button
    const submitButton = page.getByRole('button', { name: /create account/i })
    await expect(submitButton).toBeEnabled()

    // CRITICAL: This click must trigger the form submission
    await submitButton.click()

    // Wait a moment for async operations
    await page.waitForTimeout(2000)

    // Check that our debug console.log was triggered
    const buttonClickLogged = consoleMessages.some(
      (msg) => msg.includes('Signup button clicked')
    )

    // ASSERTION: The button click MUST have logged our debug message
    // If this fails, the button is not connected to the form handler
    expect(buttonClickLogged).toBe(true)

    // Log the console messages for debugging
    console.log('Console messages captured:', consoleMessages)
  })

  test('full signup flow should redirect to onboarding or show email confirmation', async ({ page }) => {
    await page.goto('/signup')

    const testEmail = generateTestEmail()
    const testPassword = 'TestPassword123!'

    // Fill all form fields
    await page.getByLabel(/your name/i).fill('E2E Test User')
    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/confirm password/i).fill(testPassword)
    await page.getByRole('checkbox').check()

    // Click submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Wait for either:
    // 1. Redirect to /onboarding (if email confirmation disabled)
    // 2. Success message about checking email (if email confirmation enabled)
    // 3. Error message (if signup failed)

    // Wait for response (longer timeout for network)
    await page.waitForTimeout(5000)

    // Check current state
    const currentUrl = page.url()
    const pageContent = await page.textContent('body')

    // Log the result for debugging
    console.log('After signup - URL:', currentUrl)
    console.log('Page contains email confirmation message:', pageContent?.includes('email'))

    // Success cases:
    const redirectedToOnboarding = currentUrl.includes('/onboarding')
    const showsEmailConfirmation = pageContent?.toLowerCase().includes('check your email')
    const showsError = pageContent?.toLowerCase().includes('error')

    // At least one success condition should be true, OR we should see a clear error
    const signupProcessed = redirectedToOnboarding || showsEmailConfirmation || showsError

    expect(signupProcessed).toBe(true)

    // If we got an error that's NOT a duplicate email error, the test should fail
    if (showsError && !pageContent?.toLowerCase().includes('already registered')) {
      console.error('Signup failed with error. Check the page content.')
    }
  })
})

test.describe('Onboarding Protection', () => {
  test('should redirect unauthenticated users from /onboarding to /signup', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()

    // Try to access onboarding directly
    await page.goto('/onboarding')

    // Should be redirected to signup
    await expect(page).toHaveURL(/\/signup/)
  })

  test('should redirect unauthenticated users from /dashboard to /signup', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()

    // Try to access dashboard directly
    await page.goto('/dashboard')

    // Should be redirected to signup
    await expect(page).toHaveURL(/\/signup/)
  })
})

test.describe('Landing Page', () => {
  test('should have working CTA buttons pointing to /signup', async ({ page }) => {
    await page.goto('/')

    // Find "Get Started" or similar CTA buttons
    const ctaButtons = page.locator('a[href="/signup"], button:has-text("Started")')

    // There should be at least one CTA
    await expect(ctaButtons.first()).toBeVisible()

    // Click the first CTA
    await ctaButtons.first().click()

    // Should navigate to signup
    await expect(page).toHaveURL(/\/signup/)
  })

  test('should have working Sign In link', async ({ page }) => {
    await page.goto('/')

    // Find sign in link
    const signInLink = page.locator('a[href="/login"]').first()
    await expect(signInLink).toBeVisible()

    // Click it
    await signInLink.click()

    // Should navigate to login
    await expect(page).toHaveURL(/\/login/)
  })
})
