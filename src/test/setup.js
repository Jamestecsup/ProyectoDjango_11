import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// A waiting query gives up after 300 ms: the tests never sleep for real (the hooks are tested with fake timers
// or with promises that the test itself resolves), so a failing test fails fast instead of hanging.
configure({ asyncUtilTimeout: 300 });

// Every test starts with an empty browser storage: persistence must never leak between tests.
beforeEach(() => {
  window.localStorage.clear();
});
