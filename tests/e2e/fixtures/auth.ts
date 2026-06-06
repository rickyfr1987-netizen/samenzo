import { expect, test as base } from "@playwright/test";

export const E2E_EMAIL_ENV = "SAMZO_E2E_EMAIL";
export const E2E_PASSWORD_ENV = "SAMZO_E2E_PASSWORD";
export const E2E_PROFILE_NAME_ENV = "SAMZO_E2E_PROFILE_NAME";

type E2EAuthUser = {
  email: string;
  password: string;
  profileName: string;
};

type AuthFixtures = {
  e2eAuthUser: E2EAuthUser;
  loginAsE2EUser: () => Promise<void>;
};

function missingRuntimeEnvNames() {
  return [E2E_EMAIL_ENV, E2E_PASSWORD_ENV, E2E_PROFILE_NAME_ENV].filter(
    (name) => !process.env[name]
  );
}

function readE2EAuthUser(): E2EAuthUser | null {
  const email = process.env[E2E_EMAIL_ENV];
  const password = process.env[E2E_PASSWORD_ENV];
  const profileName = process.env[E2E_PROFILE_NAME_ENV];

  if (!email || !password || !profileName) {
    return null;
  }

  return {
    email,
    password,
    profileName
  };
}

export const test = base.extend<AuthFixtures>({
  e2eAuthUser: async ({}, provide) => {
    const authUser = readE2EAuthUser();
    const missingEnvNames = missingRuntimeEnvNames();

    test.skip(
      authUser === null,
      [
        "Playwright auth smoke requires runtime-only local auth config.",
        `Missing: ${missingEnvNames.join(", ")}.`
      ].join(" ")
    );

    await provide(authUser as E2EAuthUser);
  },

  loginAsE2EUser: async ({ e2eAuthUser, page }, provide) => {
    await provide(async () => {
      await page.goto("/beheer/dev-login");

      await expect(
        page.getByRole("heading", { name: "Supabase dev-login" })
      ).toBeVisible();

      await page.getByLabel("E-mail").fill(e2eAuthUser.email);
      await page.getByLabel("Wachtwoord").fill(e2eAuthUser.password);
      await page.getByRole("button", { name: "Inloggen" }).click();

      const authStatusRegion = page.getByRole("region", {
        name: "Auth status"
      });

      await expect(authStatusRegion).toContainText("Ja", { timeout: 15_000 });
      await expect(authStatusRegion).toContainText(e2eAuthUser.profileName);
    });
  }
});

export { expect };
