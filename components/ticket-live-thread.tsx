"use client";

import { useEffect, useState } from "react";

export type TicketMessage = {
  id: number | string;
  message: string;
  senderName: string;
  senderRole: string;
  createdAt: string;
};

export function TicketLiveThread({ ticketId, initialMessages }: { ticketId: number | string; initialMessages: TicketMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/messages`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { messages?: TicketMessage[] };
        if (!alive || !data.messages) return;
        setMessages(data.messages);
        setUpdatedAt(new Date().toLocaleTimeString("id-ID"));
      } catch {
        // polling is best-effort
      }
    }

    const timer = window.setInterval(refresh, 3000);
    void refresh();
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [ticketId]);

  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs font-semibold text-muted">Live refresh aktif{updatedAt ? ` · terakhir ${updatedAt}` : ""}</p>
      {messages.length === 0 ? (
        <div className="rounded-xl2 border border-border p-4 text-sm text-muted">Belum ada balasan.</div>
      ) : (
        messages.map((message) => (
          <article key={message.id} className="rounded-xl2 border border-border bg-white p-4 shadow-soft">
            <p className="text-sm font-semibold">{message.senderName} · {message.senderRole}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{message.message}</p>
          </article>
        ))
      )}
    </div>
  );
}
