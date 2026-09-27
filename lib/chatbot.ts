function pickReply(message: string) {
  const text = message.toLowerCase();

  if (text.includes("halo") || text.includes("hallo") || text.includes("hai") || text.includes("help")) {
    return "Halo! Saya asisten Aeternum Shop. Saya bisa bantu seputar katalog produk premium, checkout QRIS, invoice, delivery instan, dan integrasi bot Telegram.";
  }

  if (text.includes("tutor beli") || text.includes("cara beli") || text.includes("cara checkout") || text.includes("cara order")) {
    return "Cara beli sangat mudah: pilih produk di katalog, klik Checkout, scan kode QRIS dinamis via GoPay/OVO/DANA/BCA/ShopeePay, dan pesanan/lisensi akan langsung terkirim otomatis dalam hitungan detik!";
  }

  if (text.includes("checkout") || text.includes("bayar") || text.includes("pembayaran") || text.includes("qris")) {
    return "Pembayaran menggunakan QRIS Dinamis KlikQRIS atau Saldo Dompet. Begitu pembayaran selesai, sistem otomatis memverifikasi dan mengirimkan akun ke dashboard & Telegram kamu.";
  }

  if (text.includes("pending") || text.includes("belum bayar") || text.includes("lanjut bayar")) {
    return "Jika transaksi masih pending, buka menu Dashboard > Riwayat/Pembayaran untuk melihat kode QRIS dan tekan 'Cek Status' setelah transfer.";
  }

  if (text.includes("invoice") || text.includes("cek invoice")) {
    return "Masukkan nomor invoice di navbar atau halaman invoice tracker. Kamu bisa melihat status order, QRIS, total pembayaran, dan kredensial produk.";
  }

  if (text.includes("delivery") || text.includes("akses") || text.includes("stok")) {
    return "Auto delivery mengirimkan kredensial/akun secara instan segera setelah pembayaran QRIS terkonfirmasi lunas oleh sistem.";
  }

  if (text.includes("bot") || text.includes("telegram")) {
    return "Aeternum Shop terintegrasi penuh 100% dengan Bot Telegram @aeternum_premibot. Saldo, katalog, stok, dan riwayat transaksi tersinkronisasi langsung secara real-time!";
  }

  return "Ada yang bisa dibantu mengenai produk digital, saldo dompet, atau pesanan Anda di Aeternum Shop?";
}

export function buildFallbackChatReply(message: string) {
  return pickReply(message);
}
