export type TipStatus = "idle" | "pending" | "success" | "error";

export interface TipTransaction {
  sender: string;
  amount: string;
  timestamp: number;
  txHash: string;
  blockNumber: bigint;
}
