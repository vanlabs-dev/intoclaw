import { describe, it, expect, vi, beforeEach } from "vitest";
import { pendingStore } from "../../src/lib/pending.js";

describe("pendingStore", () => {
  beforeEach(() => {
    pendingStore.cleanExpired();
    while (pendingStore._sizeForTesting() > 0) {
      pendingStore.cleanExpired();
    }
  });

  const sampleOp = {
    tool: "tao_stake_add",
    params: { netuid: 1, amount: 10 },
    agcliCommand: ["stake", "add", "--netuid", "1", "--amount", "10"],
    preview: { summary: "Stake 10 TAO on SN1" },
  };

  it("returns a UUID on create", () => {
    const id = pendingStore.createPending(sampleOp);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("retrieves a pending operation", () => {
    const id = pendingStore.createPending(sampleOp);
    const op = pendingStore.getPending(id);
    expect(op).not.toBeNull();
    expect(op?.tool).toBe("tao_stake_add");
    expect(op?.id).toBe(id);
  });

  it("returns null for unknown ID", () => {
    expect(
      pendingStore.getPending("00000000-0000-4000-a000-000000000000"),
    ).toBeNull();
  });

  it("returns null for expired operations", () => {
    vi.useFakeTimers();
    const id = pendingStore.createPending(sampleOp);
    vi.advanceTimersByTime(301_000);
    expect(pendingStore.getPending(id)).toBeNull();
    vi.useRealTimers();
  });

  it("removes a pending operation", () => {
    const id = pendingStore.createPending(sampleOp);
    pendingStore.removePending(id);
    expect(pendingStore.getPending(id)).toBeNull();
  });

  it("cleanExpired removes only expired entries", () => {
    vi.useFakeTimers();
    const id1 = pendingStore.createPending(sampleOp);
    vi.advanceTimersByTime(200_000);
    const id2 = pendingStore.createPending(sampleOp);
    vi.advanceTimersByTime(150_000);
    pendingStore.cleanExpired();
    expect(pendingStore.getPending(id1)).toBeNull();
    expect(pendingStore.getPending(id2)).not.toBeNull();
    pendingStore.removePending(id2);
    vi.useRealTimers();
  });

  it("does not store password in agcliCommand", () => {
    const id = pendingStore.createPending(sampleOp);
    const op = pendingStore.getPending(id);
    expect(op).not.toBeNull();
    const serialized = JSON.stringify(op);
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("AGCLI_PASSWORD");
    pendingStore.removePending(id);
  });
});
