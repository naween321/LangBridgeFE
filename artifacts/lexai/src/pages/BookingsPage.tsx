import { useAuth } from "@/lib/auth";
import { useGetBookings, useCancelBooking, getGetBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Video, AlertCircle, Loader2, X, CheckCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  CONFIRMED: "text-green-400 bg-green-400/10",
  PENDING: "text-yellow-400 bg-yellow-400/10",
  CANCELLED: "text-red-400 bg-red-400/10",
  COMPLETED: "text-blue-400 bg-blue-400/10",
};

export default function BookingsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { data: bookings, isLoading } = useGetBookings({ query: { enabled: !!token } });
  const cancel = useCancelBooking();

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this booking?")) return;
    await cancel.mutateAsync({ bookingId: id });
    qc.invalidateQueries({ queryKey: getGetBookingsQueryKey() });
  };

  const upcoming = bookings?.filter((b: any) => b.status === "CONFIRMED" || b.status === "PENDING") || [];
  const past = bookings?.filter((b: any) => b.status === "CANCELLED" || b.status === "COMPLETED") || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your scheduled meetings with attorneys.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !bookings || bookings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No bookings yet</h3>
          <p className="text-sm text-muted-foreground">Schedule a meeting with a lawyer from their profile page</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((b: any) => (
                  <BookingCard key={b.id} booking={b} onCancel={handleCancel} cancelling={cancel.isPending} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Past</h2>
              <div className="space-y-3 opacity-70">
                {past.map((b: any) => (
                  <BookingCard key={b.id} booking={b} onCancel={handleCancel} cancelling={cancel.isPending} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, onCancel, cancelling }: { booking: any; onCancel: (id: number) => void; cancelling: boolean }) {
  const scheduled = new Date(booking.scheduledAt);
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";

  return (
    <div className="p-5 rounded-xl border border-border bg-card/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {booking.lawyerName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{booking.lawyerName}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
              {booking.status}
            </span>
          </div>
        </div>
        {canCancel && (
          <button
            onClick={() => onCancel(booking.id)} disabled={cancelling}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{scheduled.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {booking.duration} minutes</span>
        </div>
        {booking.meetLink && (
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <a href={booking.meetLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
              Join Google Meet
            </a>
          </div>
        )}
        {booking.notes && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{booking.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
