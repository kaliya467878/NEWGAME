import crypto from "crypto";

export function generateSignature(bodyStr: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(bodyStr).digest("hex").toLowerCase();
}

export function verifySignature(bodyStr: string, signature: string, secret: string): boolean {
  const calculated = generateSignature(bodyStr, secret);
  return calculated === signature.toLowerCase();
}

export async function createSunpaysPayin(payload: {
  order_id: string;
  amount: number;
  currency: string;
  method: "upi" | "bank" | "usdt";
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notify_url?: string;
  notify_url_2?: string;
  metadata?: any;
}) {
  const baseUrl = process.env.SUNPAYS_BASE_URL || "https://cashier.sunpaytm.site";
  const apiKey = process.env.SUNPAYS_PAYIN_API_KEY;
  const apiSecret = process.env.SUNPAYS_PAYIN_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("SUNPAYS_PAYIN_API_KEY or SUNPAYS_PAYIN_API_SECRET is not configured in .env");
  }

  const body = JSON.stringify(payload);
  const signature = generateSignature(body, apiSecret);

  const response = await fetch(`${baseUrl}/api/public/v1/payins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-signature": signature,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sunpays pay-in failed: ${response.status} ${errText}`);
  }

  return response.json();
}

export async function createSunpaysPayout(payload: {
  payout_id: string;
  amount: number;
  currency: string;
  method: "bank" | "upi" | "usdt";
  beneficiary_name: string;
  beneficiary_account: string;
  beneficiary_phone?: string;
  beneficiary_email?: string;
  ifsc?: string;
  bank_name?: string;
  notify_url?: string;
  notify_url_2?: string;
  metadata?: any;
  [key: string]: any;
}) {
  const baseUrl = process.env.SUNPAYS_BASE_URL || "https://cashier.sunpaytm.site";
  const apiKey = process.env.SUNPAYS_PAYOUT_API_KEY;
  const apiSecret = process.env.SUNPAYS_PAYOUT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("SUNPAYS_PAYOUT_API_KEY or SUNPAYS_PAYOUT_API_SECRET is not configured in .env");
  }

  const body = JSON.stringify(payload);
  console.log("Sunpays API Payout Request Payload:", body);
  const signature = generateSignature(body, apiSecret);

  const response = await fetch(`${baseUrl}/api/public/v1/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-signature": signature,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sunpays payout failed: ${response.status} ${errText}`);
  }

  return response.json();
}

export async function getSunpaysPayoutStatus(transactionId: string) {
  const baseUrl = process.env.SUNPAYS_BASE_URL || "https://cashier.sunpaytm.site";
  const apiKey = process.env.SUNPAYS_PAYOUT_API_KEY;

  if (!apiKey) {
    throw new Error("SUNPAYS_PAYOUT_API_KEY is not configured in .env");
  }

  const response = await fetch(`${baseUrl}/api/public/v1/payouts/status/${transactionId}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sunpays payout status fetch failed: ${response.status} ${errText}`);
  }

  return response.json();
}

export async function getSunpaysBalance() {
  const baseUrl = process.env.SUNPAYS_BASE_URL || "https://cashier.sunpaytm.site";
  const apiKey = process.env.SUNPAYS_PAYOUT_API_KEY;

  if (!apiKey) {
    throw new Error("SUNPAYS_PAYOUT_API_KEY is not configured in .env");
  }

  const response = await fetch(`${baseUrl}/api/public/v1/balance?currency=INR`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sunpays balance fetch failed: ${response.status} ${errText}`);
  }

  return response.json();
}
