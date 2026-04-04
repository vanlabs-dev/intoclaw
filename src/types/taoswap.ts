export interface TaoSwapSubnetIdentity {
  name: string;
  url: string;
  github: string;
  image: string;
  discord: string;
  description: string;
}

export interface TaoSwapSubnet {
  id: number;
  symbol: string;
  first_block: number | null;
  owner: string | null;
  name: string;
  identity: TaoSwapSubnetIdentity | null;
  price: number;
  moving_price: number;
  price_evolution_h_1: number;
  price_evolution_h_24: number;
  price_evolution_d_7: number;
  price_evolution_d_30: number;
  price_evolution_d_90: number;
  market_cap: number;
  total_supply: number;
  emission_value: number | null;
  emission_percent: number | null;
  emission_miner_burn: number | null;
  emission_evolution_d_1: number | null;
  emission_evolution_d_30: number | null;
  emission_chain_buys: number | null;
  emission_chain_buys_percent: number | null;
  emission_ema_percent: number | null;
  registration_cost: number;
  blocks_since_epoch: number;
  tempo: number;
  modality: number;
  tao_in_emission: number | null;
  alpha_in_emission: number | null;
  alpha_out_emission: number | null;
  inflow: number | null;
  outflow: number | null;
  root_in_pool: number | null;
  alpha_in_pool: number | null;
  alpha_stake: number;
  alpha_outstanding: number;
  active_miners: number | null;
  mechanism_count: number;
  mechanism_emission_split: unknown[];
  holders_count: number;
}

export interface TaoSwapSubnetListResponse {
  results: TaoSwapSubnet[];
}

export interface TaoSwapNeuron {
  hotkey: string;
  coldkey: string;
  type: string;
  uid: number;
  mechid: number;
  stake: number;
  vtrust: number;
  consensus: number;
  dividends: number;
  incentive: number;
  emission: number;
  daily_rewards: number;
  daily_rewards_alpha: number;
  token_symbol: string;
  token_price: number;
  ip: string;
  port: number;
  block_at_registration: number;
  registration_cost: number;
  status: string;
  is_validator: boolean;
  updated_at_block: number;
  last_update: number;
  is_owner: boolean;
  delegate_take: number;
  childkey_take: number;
}

export interface TaoSwapHyperparameters {
  rho: number;
  kappa: number;
  immunity_period: number;
  min_allowed_weights: number;
  max_weight_limit: number;
  tempo: number;
  min_difficulty: string;
  max_difficulty: string;
  weights_version: string;
  weights_rate_limit: string;
  adjustment_interval: number;
  activity_cutoff: number;
  registration_allowed: boolean;
  target_regs_per_interval: number;
  min_burn: string;
  max_burn: string;
  bonds_moving_avg: number;
  max_regs_per_block: number;
  serving_rate_limit: number;
  max_validators: number;
  adjustment_alpha: string;
  difficulty: string;
  commit_reveal_period: number;
  commit_reveal_weights_enabled: boolean;
  alpha_high: number;
  alpha_low: number;
  liquid_alpha_enabled: boolean;
  alpha_sigmoid_steepness: number;
  yuma_version: number;
  subnet_is_active: boolean;
  transfers_enabled: boolean;
  bonds_reset_enabled: boolean;
  user_liquidity_enabled: boolean;
  scaling_law_power: number;
  subnetwork_n: number;
  max_n: number;
}

export interface TaoSwapSubnetDetail extends TaoSwapSubnet {
  hyperparameters: TaoSwapHyperparameters;
  neurons: TaoSwapNeuron[];
}

export interface TaoSwapSubnetHistoryPoint {
  date: string;
  tao_in_emission: number;
  alpha_in_emission: number;
  alpha_out_emission: number;
  emission_miner_burn: number;
  active_miners: number;
  total_miners: number;
  total_validators: number;
  ema_tao_inflow: number;
  ema_tao_outflow: number;
  emission_ema_percent: number;
  holders_count: number;
  delegations_count: number;
}

export interface TaoSwapSubnetHistoryResponse {
  netuid: number;
  count: number;
  results: TaoSwapSubnetHistoryPoint[];
}

export interface TaoSwapMetagraphNeuron {
  uid: number;
  mechid: number;
  stake: number;
  vtrust: number;
  consensus: number;
  dividends: number;
  incentive: number;
  emission: number;
  daily_rewards: number;
  daily_rewards_alpha: number;
  token: { symbol: string; price: number };
  coldkey: string;
  hotkey: string;
  identity: TaoSwapSubnetIdentity | null;
  ip: string;
  port: number;
  block_at_registration: number;
  registration_cost: number;
  type: string;
  status: string;
  is_validator: boolean;
  is_owner: boolean;
  updated_at_block: number;
  last_update: number;
  delegate_take: number;
  childkey_take: number;
}

export interface TaoSwapMetagraphSubnet {
  id: number;
  name: string;
  symbol: string;
  price: number;
  emission_value: number | null;
  registration_cost: number;
  blocks_since_epoch: number;
  tempo: number;
  modality: number;
  mechanism_count: number;
  mechanism_emission_split: unknown[];
}

export interface TaoSwapMetagraphResponse {
  subnet: TaoSwapMetagraphSubnet;
  count: number;
  neurons: TaoSwapMetagraphNeuron[];
}

export interface TaoSwapValidatorIdentity {
  name: string;
  url: string;
  github: string;
  image: string;
  discord: string;
  description: string;
  additional: string;
}

export interface TaoSwapValidator {
  validator_coldkey: string;
  validator_hotkey: string;
  identity: TaoSwapValidatorIdentity | null;
  take: number;
  apy_7d: number;
  total_stake_root: string;
  total_stake_alpha: string;
  total_stake: string;
  root_weight: string;
  count_delegators: number;
  dominance: string;
}

export interface TaoSwapValidatorListResponse {
  results: TaoSwapValidator[];
}

export interface TaoSwapValidatorStake {
  subnet_id: number;
  subnet_name: string;
  stake: number;
  percent: number;
}

export interface TaoSwapValidatorMonitoring {
  subnet_id: number;
  subnet_name: string;
  hotkey: string;
  uid: number;
  ownership: string;
  pending_activation_block: number | null;
  stake: number;
  vtrust: number;
  last_update: number;
  incentive: number;
  emission: number;
  dividends: number;
  take: number | null;
  proportion: number | null;
  health: string;
  health_detail: string;
}

export interface TaoSwapValidatorDetail extends TaoSwapValidator {
  delegator_daily_earning: number;
  validator_daily_earning: number;
  monitoring: TaoSwapValidatorMonitoring[];
  stakes: TaoSwapValidatorStake[];
  history: TaoSwapValidatorDetailHistoryPoint[];
}

export interface TaoSwapValidatorDetailHistoryPoint {
  date: string;
  stake_tao: number;
  root_stake_tao: number;
  alpha_stake_tao: number;
  delegator_count: number;
  delegation_count: number;
}

export interface TaoSwapValidatorHistoryPoint {
  date: string;
  stake_tao: number;
  root_stake_tao: number;
  alpha_stake_tao: number;
  alpha_stake_tao_with_slippage: number;
  stake_tao_with_slippage: number;
  delegator_count: number;
  delegation_count: number;
}

export interface TaoSwapValidatorHistoryResponse {
  hotkey: string;
  count: number;
  results: TaoSwapValidatorHistoryPoint[];
}

export interface TaoSwapPriceHistoryPoint {
  date: string;
  price: number;
  volume: number;
}

export interface TaoSwapPriceHistoryResponse {
  currency: string;
  results: TaoSwapPriceHistoryPoint[];
}

export interface TaoSwapSubnetPriceCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TaoSwapSubnetPriceHistoryResponse {
  netuid: number;
  resolution: string;
  count: number;
  results: TaoSwapSubnetPriceCandle[];
}

export interface TaoSwapHomeStats {
  apy_root: number;
  apy_best_subnet: number;
  best_subnet_name: string;
  count_delegators: number;
  dominance: number;
  fees: number;
  total_stake_alpha: number;
  total_stake_root: number;
  total_stake: number;
}

export interface TaoSwapHalvingState {
  id: number;
  at_issuance: number;
  at_block: number;
  time_remaining: string;
}

export interface TaoSwapIdentity {
  ss58_address: string;
  name: string;
  image: string;
  url: string;
  github: string;
  discord: string;
}

export interface TaoSwapIdentitiesResponse {
  results: Record<string, TaoSwapIdentity>;
  access_map: Record<string, string>;
}

export interface TaoSwapPagination {
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  total_count?: number;
  total_pages?: number;
}

export interface TaoSwapEvent {
  block: number;
  idx: number;
  extrinsic_idx: number | null;
  section: string;
  method: string;
  phase: string | null;
  data: string;
}

export interface TaoSwapEventsResponse {
  results: TaoSwapEvent[];
  pagination: TaoSwapPagination;
}

export interface TaoSwapExtrinsic {
  block: number;
  idx: number;
  hash: string;
  timestamp: string;
  module: string;
  call: string;
  category: string;
  signer: string;
  success: boolean;
  fee_rao: number;
  params: unknown;
}

export interface TaoSwapExtrinsicsResponse {
  results: TaoSwapExtrinsic[];
  pagination: TaoSwapPagination;
}

export interface TaoSwapExtrinsicCounts {
  staking: number;
  transfers: number;
  evm: number;
  other: number;
  total: number;
}

export interface TaoSwapSearchResult {
  type: string;
  ss58_address?: string;
  subnet_id?: number;
  name?: string;
  symbol?: string;
  price?: number;
  image?: string;
  validator_hotkey?: string;
  total_stake?: number;
  is_coldkey?: boolean;
}

export interface TaoSwapSearchResponse {
  count: number;
  results: TaoSwapSearchResult[];
}
