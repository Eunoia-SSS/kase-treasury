import type { Bond, CorporateAction, Holder, Proposal, RecordDateSnapshot, TreasuryTransaction } from "@/types/domain";

// All records in this file are fabricated demo values. No wallet or chain data is queried.
export const bonds: Bond[] = [
  { id: "bond-001", name: "Samruk Energy Notes", ticker: "SEN 27", issuer: "Samruk Energy JSC", currency: "KZT", faceValue: 1000, couponRate: 14.5, maturityDate: "2027-11-18", nextCouponDate: "2026-11-18", outstandingUnits: 2400000, status: "Active", color: "navy" },
  { id: "bond-002", name: "Kazakhtelecom Green Bond", ticker: "KTC 28", issuer: "Kazakhtelecom JSC", currency: "KZT", faceValue: 1000, couponRate: 13.2, maturityDate: "2028-06-01", nextCouponDate: "2026-12-01", outstandingUnits: 1850000, status: "Active", color: "teal" },
  { id: "bond-003", name: "Astana Utilities Series A", ticker: "AUA 26", issuer: "Astana Utilities LLP", currency: "KZT", faceValue: 1000, couponRate: 15.0, maturityDate: "2026-12-20", nextCouponDate: "2026-12-20", outstandingUnits: 960000, status: "Upcoming", color: "violet" },
];

export const holders: Holder[] = [
  { walletAddress: "8KQf…9n2P", bondId: "bond-001", units: 126000, sharePercent: 5.25, eligible: true },
  { walletAddress: "4vJc…3mXR", bondId: "bond-001", units: 87500, sharePercent: 3.65, eligible: true },
  { walletAddress: "9aLm…6pT1", bondId: "bond-002", units: 64000, sharePercent: 3.46, eligible: true },
];

export const snapshots: RecordDateSnapshot[] = [
  { id: "snap-demo-0918", bondId: "bond-001", recordDate: "2026-09-18", snapshotSlot: 371842901, holderCount: 1248, totalUnits: 2400000, status: "Finalized" },
  { id: "snap-demo-0901", bondId: "bond-002", recordDate: "2026-09-01", snapshotSlot: 369100442, holderCount: 962, totalUnits: 1850000, status: "Finalized" },
];

export const corporateActions: CorporateAction[] = [
  { id: "action-001", bondId: "bond-001", type: "Coupon", recordDate: "2026-09-18", paymentDate: "2026-10-18", amountPerUnit: 72.5, totalAmount: 174000000, currency: "KZT", status: "Processing" },
  { id: "action-002", bondId: "bond-002", type: "Coupon", recordDate: "2026-09-01", paymentDate: "2026-10-01", amountPerUnit: 66, totalAmount: 122100000, currency: "KZT", status: "Completed" },
  { id: "action-003", bondId: "bond-003", type: "Redemption", recordDate: "2026-12-20", paymentDate: "2026-12-20", amountPerUnit: 1000, totalAmount: 960000000, currency: "KZT", status: "Scheduled" },
];

export const proposals: Proposal[] = [
  { id: "proposal-01", bondId: "bond-001", title: "Approve revised use-of-proceeds report", description: "Review the issuer's annual allocation update for the 2026 reporting period.", votingEndsAt: "2026-10-24T18:00:00Z", votesFor: 1280000, votesAgainst: 218000, eligibleUnits: 2400000, status: "Active" },
  { id: "proposal-02", bondId: "bond-002", title: "Extend green project reporting cadence", description: "Move from semi-annual to quarterly project allocation updates.", votingEndsAt: "2026-10-02T18:00:00Z", votesFor: 982000, votesAgainst: 193000, eligibleUnits: 1850000, status: "Passed" },
];

export const transactions: TreasuryTransaction[] = [
  { signature: "5zL8…gKp2", type: "Coupon", description: "Coupon settlement batch initiated", bondTicker: "SEN 27", timestamp: "2026-10-02T09:42:00Z", amount: 174000000, currency: "KZT", status: "Confirmed" },
  { signature: "3pWq…8dLm", type: "Snapshot", description: "Record-date holder snapshot finalized", bondTicker: "SEN 27", timestamp: "2026-09-18T12:06:00Z", status: "Confirmed" },
  { signature: "7nRc…2xVa", type: "Vote", description: "Governance vote recorded", bondTicker: "KTC 28", timestamp: "2026-09-16T15:28:00Z", status: "Confirmed" },
  { signature: "2kMf…9bQe", type: "Issuance", description: "Bond token issuance recorded", bondTicker: "AUA 26", timestamp: "2026-09-11T08:13:00Z", status: "Pending" },
];

