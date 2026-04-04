export interface DesearchWebResult {
  title: string;
  link: string;
  snippet: string;
}

export interface DesearchTweetUser {
  username: string;
  name: string;
  followers_count: number;
  is_blue_verified: boolean;
}

export interface DesearchTweetResult {
  id: string;
  text: string;
  url: string;
  created_at: string;
  like_count: number;
  retweet_count: number;
  reply_count: number;
  view_count: number;
  user: DesearchTweetUser;
}

export interface DesearchMinerLinkScores {
  [url: string]: string;
}

export interface DesearchWebResponse {
  search: DesearchWebResult[];
  miner_link_scores: DesearchMinerLinkScores;
  completion: string;
}

export interface DesearchTwitterResponse {
  tweets: DesearchTweetResult[];
  miner_link_scores: DesearchMinerLinkScores;
  completion: string;
}

export interface DesearchErrorDetail {
  type: string;
  loc: string[];
  msg: string;
  input: unknown;
  ctx?: Record<string, unknown>;
}

export interface DesearchErrorResponse {
  detail: DesearchErrorDetail[] | string;
}
