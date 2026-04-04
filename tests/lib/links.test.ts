import { describe, it, expect } from "vitest";
import {
  generateSubnetSlug,
  getIntoTaoSubnetUrl,
  getIntoTaoLearnUrl,
  getTaoSwapUrl,
} from "../../src/lib/links.js";

describe("generateSubnetSlug", () => {
  it("lowercases simple names", () => {
    expect(generateSubnetSlug("Apex")).toBe("apex");
  });

  it("replaces dots with hyphens", () => {
    expect(generateSubnetSlug("Cortex.t")).toBe("cortex-t");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSubnetSlug("MySubnet V2")).toBe("mysubnet-v2");
  });

  it("collapses multiple special chars", () => {
    expect(generateSubnetSlug("Compute  Horde")).toBe("compute-horde");
  });

  it("strips leading and trailing hyphens", () => {
    expect(generateSubnetSlug("--test--")).toBe("test");
  });

  it("handles mixed special characters", () => {
    expect(generateSubnetSlug("404-GEN")).toBe("404-gen");
  });
});

describe("URL generators", () => {
  it("generates IntoTAO subnet URL", () => {
    expect(getIntoTaoSubnetUrl(18, "Zeus")).toBe(
      "https://intotao.app/subnets/18-zeus",
    );
  });

  it("generates IntoTAO subnet URL with complex name", () => {
    expect(getIntoTaoSubnetUrl(1, "Cortex.t")).toBe(
      "https://intotao.app/subnets/1-cortex-t",
    );
  });

  it("returns learn URL", () => {
    expect(getIntoTaoLearnUrl()).toBe("https://intotao.app/learn");
  });

  it("returns TaoSwap URL", () => {
    expect(getTaoSwapUrl()).toBe("https://taoswap.org");
  });
});
