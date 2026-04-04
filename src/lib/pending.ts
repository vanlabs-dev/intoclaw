import { randomUUID } from "node:crypto";
import type { SafetyAssessment } from "./safety.js";

const DEFAULT_TTL_MS = 300_000;

export interface PendingOperation {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  agcliCommand: string[];
  safetyAssessment?: SafetyAssessment;
  preview: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
}

class PendingStore {
  private ops = new Map<string, PendingOperation>();

  createPending(
    op: Omit<PendingOperation, "id" | "createdAt" | "expiresAt">,
  ): string {
    this.cleanExpired();
    const id = randomUUID();
    const now = Date.now();
    this.ops.set(id, {
      ...op,
      id,
      createdAt: now,
      expiresAt: now + DEFAULT_TTL_MS,
    });
    return id;
  }

  getPending(id: string): PendingOperation | null {
    this.cleanExpired();
    const op = this.ops.get(id);
    if (!op) return null;
    if (Date.now() > op.expiresAt) {
      this.ops.delete(id);
      return null;
    }
    return op;
  }

  removePending(id: string): void {
    this.ops.delete(id);
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [id, op] of this.ops) {
      if (now > op.expiresAt) {
        this.ops.delete(id);
      }
    }
  }

  _sizeForTesting(): number {
    return this.ops.size;
  }

  _clearForTesting(): void {
    this.ops.clear();
  }
}

export const pendingStore = new PendingStore();
