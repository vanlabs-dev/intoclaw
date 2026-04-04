export function generateSubnetSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function getIntoTaoSubnetUrl(netuid: number, name: string): string {
  return `https://intotao.app/subnets/${netuid}-${generateSubnetSlug(name)}`;
}

export function getIntoTaoLearnUrl(): string {
  return "https://intotao.app/learn";
}

export function getTaoSwapUrl(): string {
  return "https://taoswap.org";
}
