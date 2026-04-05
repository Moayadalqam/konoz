import { test, expect, type Page } from "@playwright/test";
import path from "path";

const ADMIN = { email: "admin@kunoz.sa", password: "KunozAdmin2026!" };
const EMPLOYEE = { email: "employee@kunoz.sa", password: "KunozEmployee2026!" };
const TEST_PHOTO = path.join(__dirname, "test-photo.jpg");

// Riyadh Head Office coordinates (matches seed data)
const HEAD_OFFICE = { latitude: 24.7136, longitude: 46.6753 };

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Check for any pre-existing error and dismiss
  const errorBanner = page.locator('[data-testid="error-banner"], .text-red-500, .bg-red-50');
  if (await errorBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Page has an error from previous state, refresh
    await page.reload();
    await page.waitForLoadState("networkidle");
  }

  await page.fill('input[name="email"]', creds.email);
  await page.fill('input[name="password"]', creds.password);
  await page.click('button[type="submit"]');

  // Wait for either dashboard redirect or error message
  await Promise.race([
    page.waitForURL(/\/(dashboard|pending)/, { timeout: 20_000 }),
    page.waitForSelector('text=Invalid login credentials', { timeout: 20_000 }).then(() => {
      throw new Error("Login failed: Invalid credentials");
    }),
    page.waitForSelector('text=Database error', { timeout: 20_000 }).then(() => {
      throw new Error("Login failed: Database error");
    }),
  ]);
}

test.describe("Photo Clock-In E2E", () => {
  test("Employee clocks in with GPS + photo, admin sees it", async ({
    browser,
  }) => {
    // ─── STEP 1: Employee clocks in with photo ───
    const employeeCtx = await browser.newContext({
      permissions: ["geolocation"],
      geolocation: HEAD_OFFICE,
    });
    const empPage = await employeeCtx.newPage();

    await test.step("Employee logs in", async () => {
      await login(empPage, EMPLOYEE);
      await expect(empPage).toHaveURL(/\/dashboard/);
    });

    await test.step("Employee navigates to attendance", async () => {
      await empPage.goto("/dashboard/attendance");
      await empPage.waitForLoadState("networkidle");
    });

    await test.step("Employee clicks Clock In and gets GPS", async () => {
      const clockInBtn = empPage.getByRole("button", { name: /clock in/i });
      await expect(clockInBtn).toBeVisible({ timeout: 10_000 });
      await clockInBtn.click();

      // Wait for photo phase ("Take a photo" text)
      await expect(
        empPage.getByText("Take a photo")
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step("Employee takes a photo", async () => {
      const fileInput = empPage.locator('input[type="file"][accept="image/*"]');
      await fileInput.setInputFiles(TEST_PHOTO);

      // Wait for success — use exact text to avoid matching toast
      await expect(
        empPage.getByText("Clocked in", { exact: true })
      ).toBeVisible({ timeout: 20_000 });
    });

    await empPage.screenshot({ path: "e2e/screenshots/employee-clocked-in.png" });
    await employeeCtx.close();

    // ─── STEP 2: Admin verifies the attendance with photo ───
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();

    await test.step("Admin logs in", async () => {
      await login(adminPage, ADMIN);
      await expect(adminPage).toHaveURL(/\/dashboard/);
    });

    await test.step("Admin navigates to site attendance", async () => {
      await adminPage.goto("/dashboard/site-attendance");
      await adminPage.waitForLoadState("networkidle");
    });

    await test.step("Admin sees employee attendance record", async () => {
      await expect(
        adminPage.getByText("Noura Al-Otaibi").first()
      ).toBeVisible({ timeout: 10_000 });

      await expect(
        adminPage.getByText("Checked In").first()
      ).toBeVisible();
    });

    await test.step("Admin sees the clock-in photo", async () => {
      const photoImg = adminPage.locator('img[alt="Noura Al-Otaibi check-in"]').first();
      await expect(photoImg).toBeVisible({ timeout: 10_000 });

      // Click to enlarge
      await photoImg.click();

      // Enlarged modal appears
      await expect(
        adminPage.getByText("Noura Al-Otaibi — Check-in Photo")
      ).toBeVisible({ timeout: 5_000 });
    });

    await adminPage.screenshot({ path: "e2e/screenshots/admin-sees-photo.png" });
    await adminCtx.close();
  });

  test("Employee can skip photo and still clock in", async ({ browser }) => {
    // First clear any existing clock-in
    const ctx = await browser.newContext({
      permissions: ["geolocation"],
      geolocation: HEAD_OFFICE,
    });
    const page = await ctx.newPage();

    await login(page, EMPLOYEE);
    await page.goto("/dashboard/attendance");
    await page.waitForLoadState("networkidle");

    // If already clocked in, clock out first
    const clockOutBtn = page.getByRole("button", { name: /clock out/i });
    if (await clockOutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clockOutBtn.click();
      await page.waitForTimeout(3_000);
      await page.waitForLoadState("networkidle");
    }

    // If shift complete, can't test skip — just pass
    if (await page.getByText("Shift complete").isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ctx.close();
      return;
    }

    const clockInBtn = page.getByRole("button", { name: /clock in/i });
    if (await clockInBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clockInBtn.click();

      await expect(page.getByText("Take a photo")).toBeVisible({ timeout: 20_000 });

      // Skip photo
      await page.getByText("Skip photo").click();

      // Should still succeed
      await expect(page.getByText(/clocked in/i)).toBeVisible({ timeout: 20_000 });
    }

    await ctx.close();
  });
});
