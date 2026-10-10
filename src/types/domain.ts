export type CurrencyCode = "KZT" | "USD";
export type BondStatus = "Active" | "Upcoming" | "Matured";
export type ActionType = "Coupon" | "Redemption";
export type ActionStatus = "Scheduled" | "Processing" | "Completed";
export type ProposalStatus = "Active" | "Passed" | "Closed";
export type TransactionStatus = "Confirmed" | "Pending" | "Failed";

export interface Bond {
  id: string;
  name: string;
  ticker: string;
  issuer: string;
  currency: CurrencyCode;
  faceValue: number;
  couponRate: number;
  maturityDate: string;
  nextCouponDate: string;
  outstandingUnits: number;
  status: BondStatus;
  color: "navy" | "teal" | "violet";
}

export interface Holder {
  walletAddress: string;
  bondId: string;
  units: number;
  sharePercent: number;
  eligible: boolean;
}

export interface RecordDateSnapshot {
  id: string;
  bondId: string;
  recordDate: string;
  snapshotSlot: number;
  holderCount: number;
  totalUnits: number;
  status: "Finalized" | "Pending";
}

export interface CorporateAction {
  id: string;
  bondId: string;
  type: ActionType;
  recordDate: string;
  paymentDate: string;
  amountPerUnit: number;
  totalAmount: number;
  currency: CurrencyCode;
  status: ActionStatus;
}

export interface Proposal {
  id: string;
  bondId: string;
  title: string;
  description: string;
  votingEndsAt: string;
  votesFor: number;
  votesAgainst: number;
  eligibleUnits: number;
  status: ProposalStatus;
}

export interface TreasuryTransaction {
  signature: string;
  type: "Issuance" | "Snapshot" | "Coupon" | "Redemption" | "Vote";
  description: string;
  bondTicker: string;
  timestamp: string;
  amount?: number;
  currency?: CurrencyCode;
  status: TransactionStatus;
}

