import { useAuth } from "@/lib/auth";
import { useGetUserUsage, useGetChatSessions, useGetDocuments, useGetBookings } from "@workspace/api-client-react";
import { useAuthenticatedQuery } from "@/lib/useAuthenticatedQuery";
import { MessageSquare, FileText, Calendar, Crown, ArrowRight, Scale } from "lucide-react";
import { Link } from "wouter";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { data: usage } = useAuthenticatedQuery(useGetUserUsage, token);
  const { data: sessions } = useAuthenticatedQuery(useGetChatSessions, token);
  const { data: docs } = useAuthenticatedQuery(useGetDocuments, token);
  const { data: bookings } = useAuthenticatedQuery(useGetBookings, token);

  const recentSessions = ((sessions as any)?.results || sessions as any[])?.slice(0, 3) || [];
  const recentDocs = ((docs as any)?.results || docs as any[])?.slice(0, 3) || [];
  const upcomingBookings = ((bookings as any)?.results || bookings as any[])?.filter((b: any) => b.status === "CONFIRMED" || b.status === "PENDING").slice(0, 3) || [];
  const usageData = usage as any;
  const docsData = ((docs as any)?.results || docs as any[]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Good morning, {user?.firstName}</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your legal matters today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Documents Today"
          value={`${usageData?.documentsUploadedToday || 0}/${usageData?.documentsLimit === 999 ? "∞" : usageData?.documentsLimit || 2}`}
          icon={FileText}
          sub={user?.membershipPlan === "FREE" ? "Free plan" : "Premium"}
        />
        <StatCard
          label="AI Queries Today"
          value={`${usageData?.aiQueriesUsedToday || 0}/${usageData?.aiQueriesLimit === 999 ? "∞" : usageData?.aiQueriesLimit || 10}`}
          icon={MessageSquare}
          sub="Queries used"
        />
        <StatCard
          label="Total Documents"
          value={String(docsData?.length || 0)}
          icon={FileText}
          sub="In your library"
        />
        <StatCard
          label="Upcoming Meetings"
          value={String(upcomingBookings.length)}
          icon={Calendar}
          sub="Scheduled"
        />
      </div>

      {user?.membershipPlan === "FREE" && (
        <div className="mb-6 p-5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">Upgrade to Premium</p>
              <p className="text-xs text-muted-foreground">Get unlimited uploads, queries, and priority AI responses for $10/month.</p>
            </div>
          </div>
          <Link href="/membership" className="flex items-center gap-1.5 px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-xs font-semibold whitespace-nowrap">
            Upgrade Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Recent Chats</h2>
            <Link href="/chat" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <EmptyState icon={MessageSquare} message="No chats yet" sub="Start a conversation with the AI" href="/chat" cta="Start Chat" />
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s: any) => (
                <Link key={s.id} href={`/chat?session=${s.id}`} className="block p-3.5 rounded-lg border border-border bg-card/50 hover:border-primary/30 transition-colors">
                  <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.lastMessage || "No messages yet"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.messageCount} messages</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Recent Documents</h2>
            <Link href="/documents" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentDocs.length === 0 ? (
            <EmptyState icon={FileText} message="No documents yet" sub="Upload your first legal document" href="/documents" cta="Upload Document" />
          ) : (
            <div className="space-y-2">
              {recentDocs.map((d: any) => (
                <div key={d.id} className="p-3.5 rounded-lg border border-border bg-card/50">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.fileType.toUpperCase()} · {d.fileSize ? `${Math.round(d.fileSize / 1024)}KB` : "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/chat", icon: MessageSquare, label: "New AI Chat" },
            { href: "/documents", icon: FileText, label: "Upload Document" },
            { href: "/lawyernet", icon: Scale, label: "Find a Lawyer" },
            { href: "/bookings", icon: Calendar, label: "View Bookings" },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 hover:bg-card transition-all text-center">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: any; sub: string }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card/50">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub, href, cta }: any) {
  return (
    <div className="p-6 rounded-lg border border-dashed border-border text-center">
      <Icon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mb-3">{sub}</p>
      <Link href={href} className="text-xs text-primary font-medium hover:underline">{cta}</Link>
    </div>
  );
}
