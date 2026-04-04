export interface AgcliBalanceResult {
  address: string;
  balance_rao: number;
  balance_tao: number;
}

export interface AgcliWalletEntry {
  name: string;
  address: string;
  path: string;
}

export interface AgcliStakeEntry {
  hotkey: string;
  coldkey: string;
  netuid: number;
  stake: { rao: number };
  alpha_stake: { raw: number };
}

export interface AgcliErrorResult {
  code: number;
  error: boolean;
  message: string;
}
