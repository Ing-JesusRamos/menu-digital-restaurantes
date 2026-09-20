import { afterEach, describe, expect, it } from "vitest";
import { consumeRateLimit, resetRateLimits } from "./rate-limit";

describe("consumeRateLimit", () => {
  afterEach(() => resetRateLimits());

  it("allows requests until the configured limit", () => {
    const options = { limit: 2, windowMs: 1_000 };

    expect(consumeRateLimit("key", options, 0).allowed).toBe(true);
    expect(consumeRateLimit("key", options, 1).allowed).toBe(true);
    expect(consumeRateLimit("key", options, 2).allowed).toBe(false);
    expect(consumeRateLimit("key", options, 2).remaining).toBe(0);
  });

  it("starts a new bucket after the window expires", () => {
    const options = { limit: 1, windowMs: 1_000 };

    expect(consumeRateLimit("key", options, 0).allowed).toBe(true);
    expect(consumeRateLimit("key", options, 1).allowed).toBe(false);
    expect(consumeRateLimit("key", options, 1_001).allowed).toBe(true);
  });

  it("isolates different keys", () => {
    const options = { limit: 1, windowMs: 1_000 };

    expect(consumeRateLimit("a", options, 0).allowed).toBe(true);
    expect(consumeRateLimit("a", options, 1).allowed).toBe(false);
    expect(consumeRateLimit("b", options, 1).allowed).toBe(true);
  });
});
