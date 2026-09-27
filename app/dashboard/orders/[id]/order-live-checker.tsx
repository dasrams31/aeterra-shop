"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrderLiveChecker({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleCheck = async () => {
    setChecking(true);
    setStatusMsg("Mengecek status pembayaran ke server...");
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/check-status`);
      const data = await res.json();
      if (data.paid) {
        setStatusMsg("🎉 Pembayaran terkonfirmasi lunas! Memuat produk...");
        setTimeout(() => {
          router.refresh();
        }, 1200);
      } else {
        setStatusMsg("⏳ Pembayaran belum terdeteksi. Silakan transfer lalu coba lagi.");
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch {
      setStatusMsg("⚠️ Terjadi gangguan koneksi.");
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setChecking(false);
    }
  };

  // Auto poll every 7 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/check-status`);
        const data = await res.json();
        if (data.paid) {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // ignore background poll errors
      }
    }, 7000);

    return () => clearInterval(timer);
  }, [orderNumber, router]);

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheck}
        disabled={checking}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
      >
        {checking ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Memeriksa Status...</span>
          </>
        ) : (
          <span>🔄 Cek Status Pembayaran Sekarang</span>
        )}
      </button>

      {statusMsg && (
        <p className="text-center text-xs font-semibold text-primary transition-all">
          {statusMsg}
        </p>
      )}
    </div>
  );
}
