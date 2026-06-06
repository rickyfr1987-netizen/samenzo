import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  E2E_BROWSER_TEST_DATE,
  e2eBrowserDataIds,
  e2eBrowserProfiles,
} from "../e2e/fixtures/browser-data";

describe("e2e browser data fixture", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "tests/e2e/fixtures/reset-browser-data.sql"),
    "utf8",
  );

  it("keeps the browser fixture anchored to the documented date", () => {
    expect(E2E_BROWSER_TEST_DATE).toBe("2026-06-06");
    expect(sql).toContain("2026-06-06 08:00:00+02");
  });

  it("keeps exported ids aligned with the SQL reset fixture", () => {
    for (const id of Object.values(e2eBrowserDataIds)) {
      expect(sql).toContain(id);
    }
  });

  it("uses only fictitious profile identities and stores no auth secrets", () => {
    for (const profile of Object.values(e2eBrowserProfiles)) {
      expect(profile.email).toMatch(/@example\.test$/);
      expect(sql).toContain(profile.email);
    }

    expect(sql).not.toMatch(/service_role/i);
    expect(sql).not.toMatch(/SAMZO_E2E_PASSWORD\s*=/i);
    expect(sql).not.toMatch(/secret|token/i);
  });
});
