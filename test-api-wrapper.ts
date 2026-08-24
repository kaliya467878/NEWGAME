process.env.NEXT_PUBLIC_API_URL = "https://11luckynova.vercel.app/api";
import api from "./lib/api";
import { getMyBets } from "./lib/k3Api";
import { getBalance } from "./lib/walletApi";
import { signToken } from "./lib/auth/jwt";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const userId = "732f75cd-e887-4228-bfe6-834d30b8ea03";
    const token = signToken(userId);
    
    // Inject token to axios headers directly for testing
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    // Also mock the backend base URL since we want to hit the production API!
    api.defaults.baseURL = "https://11luckynova.vercel.app/api";

    console.log("Calling getBalance...");
    const balanceRes = await getBalance();
    console.log("balanceRes structure:", JSON.stringify(balanceRes, null, 2));

    console.log("Calling getMyBets...");
    const betsRes = await getMyBets({ limit: 20, duration: "1m" });
    console.log("betsRes structure:", JSON.stringify(betsRes, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error in wrapper test:", error);
    process.exit(1);
  }
}

main();
