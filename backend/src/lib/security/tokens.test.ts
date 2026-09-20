import { describe, expect, it } from "vitest";
import { hashRequest, hashTableCode, hashToken, verifyTableCode } from "./tokens";

describe("security tokens", () => {
  it("verifies a valid table code and rejects an invalid one", () => {
    const stored = hashTableCode("1001");

    expect(verifyTableCode("1001", stored)).toBe(true);
    expect(verifyTableCode("1002", stored)).toBe(false);
  });

  it("does not store the table code in plaintext", () => {
    const stored = hashTableCode("1001");

    expect(stored).not.toContain("1001");
    expect(stored.split(":")).toHaveLength(2);
  });

  it("produces stable hashes for idempotency and tokens", () => {
    expect(hashRequest({ a: 1 })).toBe(hashRequest({ a: 1 }));
    expect(hashRequest({ a: 1 })).not.toBe(hashRequest({ a: 2 }));
    expect(hashToken("token")).toBe(hashToken("token"));
  });
});
