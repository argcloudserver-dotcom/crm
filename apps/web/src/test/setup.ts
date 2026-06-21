import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ensure React trees are unmounted between tests so timers/effects don't leak.
afterEach(() => {
  cleanup();
});
