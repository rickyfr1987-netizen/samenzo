import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string | { toString(): string };
  }) =>
    React.createElement(
      "a",
      {
        href: typeof href === "string" ? href : href.toString(),
        ...props
      },
      children
    )
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
