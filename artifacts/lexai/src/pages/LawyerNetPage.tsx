import { useState } from "react";
import { useGetLawyers, useGetLawyerStats } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Star, Search, Users, Loader2, Globe } from "lucide-react";

const SPECIALIZATIONS = ["All", "Corporate Law", "Criminal Defense", "Family Law", "Immigration", "Intellectual Property", "Real Estate", "Employment Law", "Tax Law", "Personal Injury", "Contract Law"];
const LANGUAGES = ["All", "English", "Spanish", "French", "Arabic", "Chinese"];

export default function LawyerNetPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All");
  const [lang, setLang] = useState("All");
  const [minRating, setMinRating] = useState("");

  const { data: lawyers, isLoading } = useGetLawyers(
    {
      specialization: spec !== "All" ? spec : undefined,
      language: lang !== "All" ? lang : undefined,
      search: search || undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
    },
    { query: { enabled: !!token } }
  );

  const { data: stats } = useGetLawyerStats({ query: { enabled: !!token } });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">LawyerNet</h1>
        <p className="text-muted-foreground mt-1 text-sm">Connect with verified attorneys across all specializations.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-2xl font-bold text-primary">{(stats as any).totalLawyers}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Verified Lawyers</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/50">
            <p className="text-2xl font-bold text-primary">{(stats as any).averageRating?.toFixed(1) || "N/A"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Average Rating</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-48 px-3.5 py-2.5 rounded-xl border border-border bg-card/50">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search lawyers..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none flex-1"
          />
        </div>
        <select value={spec} onChange={e => setSpec(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-card/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={lang} onChange={e => setLang(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-card/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
        </select>
        <select value={minRating} onChange={e => setMinRating(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-card/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Any Rating</option>
          <option value="4">4+ Stars</option>
          <option value="4.5">4.5+ Stars</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !lawyers || (lawyers as any[]).length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No lawyers found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(lawyers as any[]).map((l: any) => (
            <Link key={l.id} href={`/lawyernet/${l.id}`} className="block p-5 rounded-xl border border-border bg-card/50 hover:border-primary/40 hover:bg-card transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {l.firstName?.[0]}{l.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {l.firstName} {l.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{l.specialization}</p>
                  {l.verificationStatus === "APPROVED" && (
                    <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-3">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(l.rating || 0) ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">{(l.rating || 0).toFixed(1)} ({l.reviewCount || 0})</span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">{l.yearsOfExperience}y</span> experience
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {l.languages?.slice(0, 3).join(", ")}
                </div>
                {l.hourlyRate && (
                  <div className="font-medium text-primary">${l.hourlyRate}/hr</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
