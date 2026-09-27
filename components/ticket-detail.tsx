import { TicketLiveThread } from "@/components/ticket-live-thread";

type TicketDetailProps = {
  ticket: {
    id: number | string;
    subject: string;
    status: string;
    orderNumber: string | null;
    sellerStoreName: string | null;
    buyerName: string;
  };
  messages: Array<{
    id: number | string;
    message: string;
    senderName: string;
    senderRole: string;
    createdAt: Date;
  }>;
  basePath: "dashboard" | "admin" | "seller";
};

export function TicketDetail({ ticket, messages, basePath }: TicketDetailProps) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Ticket {ticket.status}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{ticket.subject}</h1>
      <p className="mt-2 text-sm text-muted">{ticket.buyerName}{ticket.orderNumber ? ` · ${ticket.orderNumber}` : ""}{ticket.sellerStoreName ? ` · ${ticket.sellerStoreName}` : ""}</p>

      <TicketLiveThread ticketId={ticket.id} initialMessages={messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() }))} />

      {ticket.status !== "closed" ? (
        <form className="mt-6 grid gap-3 rounded-xl2 border border-border bg-white p-4 shadow-soft" method="post" action={`/api/tickets/${ticket.id}/reply`}>
          <label className="text-sm font-semibold">Balas ticket</label>
          <textarea name="message" className="min-h-28 rounded-xl border border-border bg-surfaceSoft px-3 py-2 text-sm" required />
          <button className="rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-white">Kirim balasan</button>
        </form>
      ) : null}

      {basePath === "admin" ? (
        <form className="mt-3 flex flex-wrap gap-2" method="post" action={`/api/admin/tickets/${ticket.id}/status`}>
          <button name="status" value="open" className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">Open</button>
          <button name="status" value="pending" className="rounded-xl border border-border bg-surfaceSoft px-4 py-2 text-sm font-semibold">Pending</button>
          <button name="status" value="closed" className="rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-white">Close</button>
        </form>
      ) : null}
    </div>
  );
}
