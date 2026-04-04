import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";

export type SafetyVerdict = "safe" | "warning" | "blocked";

export interface SafetyCheck {
  name: string;
  passed: boolean;
  severity: "info" | "warning" | "block";
  message: string;
}

export interface SafetyAssessment {
  verdict: SafetyVerdict;
  netuid: number;
  subnetName: string;
  checks: SafetyCheck[];
  summary: string;
}

export async function assessStakingSafety(
  netuid: number,
  amountTao: number,
): Promise<SafetyAssessment> {
  const checks: SafetyCheck[] = [];
  let subnetName = `SN${netuid}`;

  try {
    const subnet = await taoswap.getSubnet(netuid);
    subnetName = subnet.name;
    const alphaPrice = subnet.price;
    const poolDepth = subnet.root_in_pool;

    if (alphaPrice > 1) {
      checks.push({
        name: "subnet_active",
        passed: false,
        severity: "block",
        message: `Subnet ${netuid} (${subnetName}) is INACTIVE (deregistered). Alpha price is ${alphaPrice.toFixed(5)} TAO per unit. Staking would result in near-total loss when re-registered.`,
      });
    } else {
      checks.push({
        name: "subnet_active",
        passed: true,
        severity: "info",
        message: `Subnet ${netuid} (${subnetName}) is active. Alpha price: ${alphaPrice.toFixed(5)} TAO.`,
      });
    }

    if (poolDepth !== null && poolDepth < 10 && alphaPrice <= 1) {
      checks.push({
        name: "recently_registered",
        passed: false,
        severity: "warning",
        message: `This subnet appears recently re-registered. Pool depth is approximately ${poolDepth.toFixed(2)} TAO. Liquidity is extremely low.`,
      });
    }

    if (poolDepth !== null && poolDepth > 0 && alphaPrice <= 1) {
      const slippage = amountTao / (poolDepth + amountTao);
      const slippagePct = slippage * 100;
      const estimatedLoss = amountTao * slippage;

      if (slippagePct > 25) {
        checks.push({
          name: "slippage",
          passed: false,
          severity: "block",
          message: `Estimated slippage is approximately ${slippagePct.toFixed(1)}%. You would lose approximately ${estimatedLoss.toFixed(4)} TAO.`,
        });
      } else if (slippagePct > 10) {
        checks.push({
          name: "slippage",
          passed: false,
          severity: "warning",
          message: `Estimated slippage is approximately ${slippagePct.toFixed(1)}%. You would lose approximately ${estimatedLoss.toFixed(4)} TAO.`,
        });
      } else {
        checks.push({
          name: "slippage",
          passed: true,
          severity: "info",
          message: `Estimated slippage is approximately ${slippagePct.toFixed(1)}%.`,
        });
      }
    }

    const verdict = computeVerdict(checks);
    return {
      verdict,
      netuid,
      subnetName,
      checks,
      summary: buildSummary(
        netuid,
        subnetName,
        alphaPrice,
        poolDepth,
        amountTao,
        verdict,
      ),
    };
  } catch (err) {
    if (
      err instanceof TaoSwapApiError &&
      err.status === 404
    ) {
      checks.push({
        name: "subnet_exists",
        passed: false,
        severity: "block",
        message: `Subnet ${netuid} not found. Verify the subnet ID is correct.`,
      });
      return {
        verdict: "blocked",
        netuid,
        subnetName,
        checks,
        summary: `Subnet ${netuid} not found.`,
      };
    }

    checks.push({
      name: "api_available",
      passed: false,
      severity: "block",
      message:
        "Cannot verify subnet safety. TaoSwap API is unavailable. Try again later.",
    });
    return {
      verdict: "blocked",
      netuid,
      subnetName,
      checks,
      summary:
        "Cannot verify subnet safety. TaoSwap API is unavailable. Try again later.",
    };
  }
}

function computeVerdict(checks: SafetyCheck[]): SafetyVerdict {
  if (checks.some((c) => c.severity === "block" && !c.passed)) {
    return "blocked";
  }
  if (checks.some((c) => c.severity === "warning" && !c.passed)) {
    return "warning";
  }
  return "safe";
}

function buildSummary(
  netuid: number,
  name: string,
  alphaPrice: number,
  poolDepth: number | null,
  amountTao: number,
  verdict: SafetyVerdict,
): string {
  const status = alphaPrice > 1 ? "INACTIVE" : "Active";
  const pool = poolDepth !== null ? `${poolDepth.toFixed(2)} TAO` : "unknown";
  const pctOfPool =
    poolDepth !== null && poolDepth > 0
      ? `approximately ${((amountTao / poolDepth) * 100).toFixed(1)}% of pool`
      : "unknown";
  const slippage =
    poolDepth !== null && poolDepth > 0
      ? `approximately ${((amountTao / (poolDepth + amountTao)) * 100).toFixed(1)}%`
      : "unknown";
  const risk =
    verdict === "blocked"
      ? "BLOCKED"
      : verdict === "warning"
        ? "Medium"
        : "Low";

  return [
    `Subnet: ${name} (SN${netuid})`,
    `Status: ${status}`,
    `Pool depth: ${pool}`,
    `Your stake: ${amountTao} TAO (${pctOfPool})`,
    `Estimated slippage: ${slippage}`,
    `Risk level: ${risk}`,
  ].join("\n");
}
