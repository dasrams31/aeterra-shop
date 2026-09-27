import crypto from "node:crypto";

export interface KlikQrisCreateResponse {
  status: boolean;
  message: string;
  data?: {
    order_id: string;
    nama_toko?: string;
    tanggal?: string;
    notifwa?: string;
    mdr?: string;
    redirect_url?: string;
    amount_uniq?: string;
    amount?: string;
    total_amount?: string;
    status?: string;
    qris_url?: string;
    report_url?: string;
    expired_at?: string;
    paid_at?: string | null;
    signature?: string;
    keterangan?: string | null;
    expired_menit?: string;
    qris_image?: string;
  };
}

export interface KlikQrisStatusResponse {
  status: boolean;
  message: string;
  data?: {
    order_id: string;
    nama_toko?: string;
    status?: string; // "PAID", "PENDING", "EXPIRED", "FAILED"
    amount?: string;
    total_amount?: string;
    paid_at?: string | null;
    signature?: string;
    report_url?: string;
    qris_url?: string;
  };
}

export async function createKlikQrisTransaction(params: {
  orderId: string;
  amount: number;
  customerName?: string;
  description?: string;
  redirectUrl?: string;
}): Promise<{
  success: boolean;
  orderId: string;
  totalAmount: number;
  rawAmount: number;
  amountUniq: number;
  qrisUrl?: string;
  qrisImage?: string;
  reportUrl?: string;
  signature?: string;
  expiredAt?: string;
  error?: string;
}> {
  const apiKey = process.env.KLIKQRIS_API_KEY || "rAqu7TOfO43WrZC1WFVF7fNqGQGlIAr0UvR0k6pg";
  const merchantId = process.env.KLIKQRIS_MERCHANT_ID || "179046112227";
  const baseUrl = (process.env.KLIKQRIS_BASE_URL || "https://klikqris.com/api").replace(/\/+$/, "");

  const url = `${baseUrl}/qris/create`;
  const payload = {
    order_id: params.orderId,
    amount: Math.round(params.amount),
    id_merchant: String(merchantId),
    keterangan: params.description || `Pesanan #${params.orderId} - Aeternum Shop`,
    redirect_url: params.redirectUrl || "https://shop.dasrams.biz.id",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "id_merchant": String(merchantId),
        "User-Agent": "AeternumShop/1.0",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as KlikQrisCreateResponse;
    if ((response.ok || response.status === 201) && data.status && data.data) {
      const d = data.data;
      const totalAmount = parseFloat(d.total_amount || d.amount || String(params.amount));
      const rawAmount = parseFloat(d.amount || String(params.amount));
      const amountUniq = parseFloat(d.amount_uniq || "0");

      return {
        success: true,
        orderId: d.order_id || params.orderId,
        totalAmount,
        rawAmount,
        amountUniq,
        qrisUrl: d.qris_url,
        qrisImage: d.qris_image,
        reportUrl: d.report_url,
        signature: d.signature,
        expiredAt: d.expired_at,
      };
    }

    return {
      success: false,
      orderId: params.orderId,
      totalAmount: params.amount,
      rawAmount: params.amount,
      amountUniq: 0,
      error: data.message || `HTTP ${response.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      orderId: params.orderId,
      totalAmount: params.amount,
      rawAmount: params.amount,
      amountUniq: 0,
      error: err.message || "Network error",
    };
  }
}

export async function checkKlikQrisStatus(orderId: string): Promise<KlikQrisStatusResponse | null> {
  const apiKey = process.env.KLIKQRIS_API_KEY || "rAqu7TOfO43WrZC1WFVF7fNqGQGlIAr0UvR0k6pg";
  const merchantId = process.env.KLIKQRIS_MERCHANT_ID || "179046112227";
  const baseUrl = (process.env.KLIKQRIS_BASE_URL || "https://klikqris.com/api").replace(/\/+$/, "");

  const url = `${baseUrl}/qris/status/${encodeURIComponent(orderId)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "id_merchant": String(merchantId),
        "User-Agent": "AeternumShop/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as KlikQrisStatusResponse;
  } catch {
    return null;
  }
}

export function verifyKlikQrisWebhookSignature(
  receivedSignature: string | null | undefined,
  bodyString: string
): boolean {
  const apiKey = process.env.KLIKQRIS_API_KEY || "rAqu7TOfO43WrZC1WFVF7fNqGQGlIAr0UvR0k6pg";
  if (!receivedSignature || !apiKey) return true;

  try {
    const expected = crypto.createHmac("sha256", apiKey).update(bodyString).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSignature));
  } catch {
    return true;
  }
}
