import { test, expect } from "@playwright/test";

/**
 * Smoke test: register, land on the home page with a balance, open a slot,
 * spin (server round-trip), then check the history page.
 */
test.describe("Catsino smoke", () => {
  test("registers and spins a slot", async ({ page }) => {
    const email = `e2e-${Date.now()}@catsino.test`;
    await page.goto("/register");
    await page.getByLabel("Display name").fill("E2E Cat");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("supersecret123");
    await page.getByRole("button", { name: /welcome coins/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/CATSINO|The Cat/i).first()).toBeVisible();

    // Open a slot.
    await page.goto("/games/slots/cat-meow");
    await expect(page.getByTestId("slot-reels")).toBeVisible();
    await page.getByRole("button", { name: /spin/i }).click();

    // A result banner appears after the server round-trip.
    await expect(page.getByRole("status")).toBeVisible({ timeout: 15_000 });

    // History reflects the round.
    await page.goto("/history");
    await expect(page.getByText(/Cat Meow/)).toBeVisible();
  });

  test("shows the landing page to anonymous visitors", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /claim 10,000 free coins/i }),
    ).toBeVisible();
  });
});
