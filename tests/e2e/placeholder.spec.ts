import { expect, test } from "@playwright/test";

test("playwright bootstrap is wired", async ({ page }) => {
  await page.setContent("<main><h1>EduGames bootstrap</h1></main>");

  await expect(
    page.getByRole("heading", { name: "EduGames bootstrap" })
  ).toBeVisible();
});
