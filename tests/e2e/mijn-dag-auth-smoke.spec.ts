import { expect, test } from "./fixtures/auth";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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
  await expect(contextRegion.getByText("Ingelogd", { exact: true })).toBeVisible({
    timeout: 15_000
  });
  await expect(contextRegion.getByText("Profiel", { exact: true })).toBeVisible();
  await expect(contextRegion).toContainText(e2eAuthUser.profileName);
  await expect(page.getByRole("heading", { name: "Nog niet ingelogd" })).toHaveCount(0);
});

test("doorloopt Mijn dag datum-, profielwissel- en doelacceptatieroute", async ({
  e2eAuthUser,
  loginAsE2EUser,
  page
}) => {
  await loginAsE2EUser();

  await page.goto("/mijn-dag");
  await expect(page.getByRole("heading", { name: "Mijn dag" })).toBeVisible();
  const contextRegion = page.getByRole("region", { name: "Huidige context" });
  await expect(contextRegion.getByText("Ingelogd", { exact: true })).toBeVisible({
    timeout: 15_000
  });
  await expect(contextRegion).toContainText(e2eAuthUser.profileName);
  await expect(page.getByRole("button", { name: "Vorige dag" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Vandaag" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Volgende dag" })).toBeVisible();

  const dateInput = page.getByRole("textbox", { name: "Datum" });
  const goalDate = toDateInputValue(new Date(2026, 5, 6));

  await dateInput.fill(goalDate);
  await expect(dateInput).toHaveValue(goalDate);

  await page.getByRole("button", { name: "Vorige dag" }).click();
  await expect(dateInput).toHaveValue("2026-06-05");

  await page.getByRole("button", { name: "Volgende dag" }).click();
  await expect(dateInput).toHaveValue(goalDate);

  const targetGoalHeading = page.getByRole("heading", { name: "E2E doel onder aandacht" });

  await expect(targetGoalHeading).toBeVisible();
  const targetGoalCard = page.locator("article", { has: targetGoalHeading });
  await targetGoalCard.getByRole("button", { name: "Accepteren" }).click();

  await expect(page.getByText("Het doel is geaccepteerd.")).toBeVisible();

  await page.getByRole("button", { name: "Vandaag" }).click();
  await expect(dateInput).toHaveValue(toDateInputValue(new Date()));

  const profileSwitch = page.getByRole("combobox", { name: "Bekijk als" });
  await expect(profileSwitch).toBeVisible();
  await profileSwitch.selectOption({ label: "Milan Medewerker" });
  await expect(page.getByText("Milan Medewerker")).toBeVisible();
  await expect(page.getByText(e2eAuthUser.profileName)).toBeVisible();
});
