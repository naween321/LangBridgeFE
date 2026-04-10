import { useAuth } from "@/lib/auth";
import { useGetMembership, useUpgradeMembership, useCancelMembership, getGetMembershipQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Crown, Zap, AlertCircle, Loader2 } from "lucide-react";

const FREE_FEATURES = ["2 document uploads per day", "10 AI queries per day", "Access to LawyerNet directory", "Basic chat support"];
const PREMIUM_FEATURES = ["Unlimited document uploads", "Unlimited AI queries", "Priority AI responses", "Advanced document analysis", "Document translation", "Full LawyerNet access", "Priority lawyer matching"];

export default function MembershipPage() {
  const { token, user, updateUser } = useAuth();
  const qc = useQueryClient();
  const { data: membership, isLoading } = useGetMembership({ query: { enabled: !!token } });
  const upgrade = useUpgradeMembership();
  const cancel = useCancelMembership();

  const isPremium = user?.membershipPlan === "PREMIUM";

  const handleUpgrade = async () => {
    if (!confirm("Upgrade to Premium for $10/month?")) return;
    try {
      await upgrade.mutateAsync({ data: { plan: "PREMIUM" } });
      qc.invalidateQueries({ queryKey: getGetMembershipQueryKey() });
      if (user) updateUser({ ...user, membershipPlan: "PREMIUM" });
    } catch (err: any) {
      alert(err.message || "Upgrade failed");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your Premium subscription? You'll revert to the Free plan.")) return;
    try {
      await cancel.mutateAsync();
      qc.invalidateQueries({ queryKey: getGetMembershipQueryKey() });
      if (user) updateUser({ ...user, membershipPlan: "FREE" });
    } catch (err: any) {
      alert(err.message || "Cancellation failed");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Membership</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your subscription and access.</p>
      </div>

      {/* Current Plan Banner */}
      <div className={`p-5 rounded-xl border mb-8 flex items-center justify-between ${isPremium ? "border-primary/40 bg-primary/5" : "border-border bg-card/50"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPremium ? "gold-gradient" : "bg-secondary"}`}>
            <Crown className={`w-5 h-5 ${isPremium ? "text-primary-foreground" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-semibold text-foreground">{isPremium ? "Premium Plan" : "Free Plan"}</p>
            <p className="text-xs text-muted-foreground">
              {isPremium
                ? membership?.expiresAt ? `Renews ${new Date(membership.expiresAt).toLocaleDateString()}` : "Active subscription"
                : "Free forever — upgrade for unlimited access"}
            </p>
          </div>
        </div>
        {isPremium && (
          <button
            onClick={handleCancel} disabled={cancel.isPending}
            className="text-xs text-destructive hover:underline font-medium disabled:opacity-60"
          >
            {cancel.isPending ? "Cancelling..." : "Cancel Plan"}
          </button>
        )}
      </div>

      {/* Usage */}
      {membership && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-xs text-muted-foreground mb-1">Document Uploads</p>
            <p className="text-2xl font-bold text-foreground">{membership.documentsLimit === 999 ? "Unlimited" : `${membership.documentsLimit}/day`}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-xs text-muted-foreground mb-1">AI Queries</p>
            <p className="text-2xl font-bold text-foreground">{membership.aiQueriesLimit === 999 ? "Unlimited" : `${membership.aiQueriesLimit}/day`}</p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <div className={`p-6 rounded-xl border ${!isPremium ? "border-primary/40 bg-primary/5" : "border-border bg-card/50"}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground text-lg">Free</h3>
              <p className="text-2xl font-bold text-primary mt-1">$0 <span className="text-sm text-muted-foreground font-normal">/forever</span></p>
            </div>
            {!isPremium && <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">Current Plan</span>}
          </div>
          <ul className="space-y-2.5">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Premium */}
        <div className={`p-6 rounded-xl border relative ${isPremium ? "border-primary/60 bg-primary/5" : "border-border bg-card/50"}`}>
          {!isPremium && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full gold-gradient text-primary-foreground text-xs font-semibold">Most Popular</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground text-lg">Premium</h3>
              <p className="text-2xl font-bold text-primary mt-1">$10 <span className="text-sm text-muted-foreground font-normal">/month</span></p>
            </div>
            {isPremium && <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">Current Plan</span>}
          </div>
          <ul className="space-y-2.5 mb-6">
            {PREMIUM_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <Zap className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
          {!isPremium && (
            <button
              onClick={handleUpgrade} disabled={upgrade.isPending}
              className="w-full py-2.5 rounded-lg gold-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {upgrade.isPending ? "Upgrading..." : "Upgrade to Premium"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl border border-border bg-card/30 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Payments are processed securely. For billing questions, contact our support team. Subscriptions can be cancelled at any time.
        </p>
      </div>
    </div>
  );
}
