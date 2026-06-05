import { expect, test } from "./fixtures/auth";

test("laadt Mijn dag met ingelogde profielcontext", async ({
  e2eAuthUser,
  loginAsE2EUser,
  page
}) => {
  await loginAsE2EUser();

  await page.goto("/mijn-dag");

  await expect(page.getByRole("heading", { name: "Mijn dag" })).toBeVisible();

  const contextRegion = page.getByRole("region", { name: "Huidige context" });
  await expect(contextRegion.getByText("Auth")).toBeVisible();
  await expect(contextRegion.getByText("Ingelogd")).toBeVisible();
  await expect(contextRegion.getByText("Profiel")).toBeVisible();
  await expect(contextRegion.getByText(e2eAuthUser.profileName)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nog niet ingelogd" })).toHaveCount(0);
});
