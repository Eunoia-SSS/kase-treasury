export const DEFAULT_PROGRAM_ID = "7P3NaKZkqSKHYjTUF638mZifpWMeVq1qvfPNNjtVFjWZ";
export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || DEFAULT_PROGRAM_ID;
export const LIVE_MODE = process.env.NEXT_PUBLIC_APP_MODE === "live";
export const LOCALNET_RPC = process.env.NEXT_PUBLIC_LOCALNET_RPC_URL || "http://127.0.0.1:8899";
export const DEVNET_RPC = process.env.NEXT_PUBLIC_DEVNET_RPC_URL || "https://api.devnet.solana.com";
