import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetLawyer, useGetLawyerReviews, useAddLawyerReview, useGetLawyerAvailability,
  useCreateBooking, useStartConversation,
  getGetLawyerReviewsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Globe, Calendar, MessageSquare, Shield, Loader2, X, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function LawyerProfilePage() {
  const params = useParams<{ id: string }>();
  const lawyerId = parseInt(params.id || "0");
  const { token, user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [showBooking, setShowBooking] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [bookingNote, setBookingNote] = useState("");

  const { data: lawyer, isLoading } = useGetLawyer(lawyerId, { query: { enabled: !!lawyerId } });
  const { data: reviews } = useGetLawyerReviews(lawyerId, { query: { enabled: !!lawyerId } });
  const { data: slots } = useGetLawyerAvailability(lawyerId, {}, { query: { enabled: !!lawyerId } });
  const addReview = useAddLawyerReview();
  const createBooking = useCreateBooking();
  const startConversation = useStartConversation();

  const lawyerData = lawyer as any;
  const reviewsData = reviews as any[];
  const slotsData = slots as any[];

  const handleChat = async () => {
    try {
      await startConversation.mutateAsync({ data: { lawyerId, initialMessage: "Hello, I'd like to discuss my legal matter with you." } });
      setLocation("/messages");
    } catch {}
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    try {
      await createBooking.mutateAsync({ data: { lawyerId, scheduledAt: selectedSlot, duration: 60, notes: bookingNote } });
      setShowBooking(false);
      setLocation("/bookings");
    } catch {}
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    await addReview.mutateAsync({ lawyerId, data: review });
    qc.invalidateQueries({ queryKey: getGetLawyerReviewsQueryKey(lawyerId) });
    setShowReview(false);
    setReview({ rating: 5, comment: "" });
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!lawyerData) {
    return <div className="p-6 text-muted-foreground">Lawyer not found</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/lawyernet" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to LawyerNet
      </Link>

      {/* Profile Header */}
      <div className="p-6 rounded-xl border border-border bg-card/50 mb-6">
        <div className="flex gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
            {lawyerData.firstName?.[0]}{lawyerData.lastName?.[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">{lawyerData.firstName} {lawyerData.lastName}</h1>
                <p className="text-sm text-muted-foreground">{lawyerData.specialization}</p>
                {lawyerData.verificationStatus === "APPROVED" && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Verified Attorney</span>
                  </div>
                )}
              </div>
              {lawyerData.hourlyRate && (
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">${lawyerData.hourlyRate}</span>
                  <p className="text-xs text-muted-foreground">/hour</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className={`w-4 h-4 ${n <= Math.round(lawyerData.rating || 0) ? "text-primary fill-primary" : "text-muted-foreground"}`} />
              ))}
              <span className="text-sm text-muted-foreground ml-1">{(lawyerData.rating || 0).toFixed(1)} ({lawyerData.reviewCount || 0} reviews)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Experience</p>
            <p className="text-sm font-semibold text-foreground">{lawyerData.yearsOfExperience} years</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Languages</p>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">{lawyerData.languages?.join(", ")}</p>
            </div>
          </div>
          {lawyerData.barNumber && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Bar Number</p>
              <p className="text-sm font-semibold text-foreground">{lawyerData.barNumber}</p>
            </div>
          )}
        </div>

        {lawyerData.bio && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{lawyerData.bio}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleChat}
            disabled={startConversation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            {startConversation.isPending ? "Starting..." : "Chat with Lawyer"}
          </button>
          <button
            onClick={() => setShowBooking(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Calendar className="w-4 h-4" />
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* Reviews */}
      <div className="p-6 rounded-xl border border-border bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Reviews</h2>
          <button onClick={() => setShowReview(true)} className="text-xs text-primary font-medium hover:underline">
            Write a Review
          </button>
        </div>
        {!reviewsData || reviewsData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {reviewsData.map((r: any) => (
              <div key={r.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{r.userName || "Anonymous"}</span>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`w-3 h-3 ${n <= r.rating ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Schedule Meeting</h3>
              <button onClick={() => setShowBooking(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Select an available time slot</p>
            <div className="grid grid-cols-2 gap-2 mb-4 max-h-48 overflow-y-auto">
              {slotsData?.filter((s: any) => s.available).map((s: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(s.startTime)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    selectedSlot === s.startTime ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  {new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </button>
              ))}
              {(!slotsData || slotsData.filter((s: any) => s.available).length === 0) && (
                <p className="text-xs text-muted-foreground col-span-2 text-center py-4">No available slots. Any time works for this demo.</p>
              )}
            </div>
            {!selectedSlot && (
              <button
                onClick={() => setSelectedSlot(new Date(Date.now() + 3600000).toISOString())}
                className="w-full mb-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                Use next available time
              </button>
            )}
            <textarea
              value={bookingNote}
              onChange={e => setBookingNote(e.target.value)}
              placeholder="Notes for the lawyer (optional)..."
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
              rows={2}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowBooking(false)} className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary/80">
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={!selectedSlot || createBooking.isPending}
                className="flex-1 py-2.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {createBooking.isPending ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Write a Review</h3>
              <button onClick={() => setShowReview(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setReview(r => ({ ...r, rating: n }))}>
                      <Star className={`w-7 h-7 transition-colors ${n <= review.rating ? "text-primary fill-primary" : "text-muted-foreground hover:text-primary"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Comment</label>
                <textarea
                  value={review.comment}
                  onChange={e => setReview(r => ({ ...r, comment: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={3} placeholder="Share your experience..."
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowReview(false)} className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary/80">
                  Cancel
                </button>
                <button type="submit" disabled={addReview.isPending} className="flex-1 py-2.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                  {addReview.isPending ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
