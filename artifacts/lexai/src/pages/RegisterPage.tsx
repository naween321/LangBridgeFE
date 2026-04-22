import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Scale, Eye, EyeOff, AlertCircle, ChevronRight } from "lucide-react";

const SPECIALIZATIONS = ["Corporate Law", "Criminal Defense", "Family Law", "Immigration", "Intellectual Property", "Real Estate", "Employment Law", "Tax Law", "Personal Injury", "Contract Law"];
const LANGUAGES_LIST = ["English", "Spanish", "French", "Arabic", "Chinese", "Portuguese", "German", "Italian"];

export default function RegisterPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "", firstName: "", lastName: "", password: "", role: "NORMAL" as "NORMAL" | "LAWYER",
  });
  const [lawyerForm, setLawyerForm] = useState({
    barNumber: "", yearsOfExperience: 1, languages: ["English"], specialization: "Corporate Law", age: 30, bio: "", hourlyRate: 150,
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.role === "LAWYER") {
      setStep(2);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/register", null, {
        method: "POST",
        body: JSON.stringify({ ...form }),
      });
      login(data.token, data.refresh_token || "", data.user);

      if (form.role === "LAWYER") {
        try {
          await apiFetch("/users/lawyer-profile", data.token, {
            method: "POST",
            body: JSON.stringify(lawyerForm),
          });
        } catch {}
      }

      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setLawyerForm(f => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter(l => l !== lang) : [...f.languages, lang],
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 gold-gradient rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">LexAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {step === 1 ? "Create your account" : "Lawyer Verification"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1 ? "Join thousands of users who trust LexAI" : "Complete your professional profile"}
          </p>
          {form.role === "LAWYER" && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {[1, 2].map(n => (
                <div key={n} className={`w-2 h-2 rounded-full transition-colors ${n <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">First Name</label>
                  <input
                    type="text" value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Jane" required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Last Name</label>
                  <input
                    type="text" value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Smith" required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="you@example.com" required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-10 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Min 8 characters" required minLength={8}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["NORMAL", "LAWYER"] as const).map(r => (
                    <button
                      key={r} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r }))}
                      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                        form.role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {r === "NORMAL" ? "Normal User" : "Lawyer"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg gold-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {form.role === "LAWYER" ? (<>Next <ChevronRight className="w-4 h-4" /></>) : loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Bar Number</label>
                  <input
                    type="text" value={lawyerForm.barNumber}
                    onChange={e => setLawyerForm(f => ({ ...f, barNumber: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="BAR123456" required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Years Exp.</label>
                  <input
                    type="number" value={lawyerForm.yearsOfExperience} min={0} max={60}
                    onChange={e => setLawyerForm(f => ({ ...f, yearsOfExperience: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Age</label>
                  <input
                    type="number" value={lawyerForm.age} min={21} max={90}
                    onChange={e => setLawyerForm(f => ({ ...f, age: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Rate ($/hr)</label>
                  <input
                    type="number" value={lawyerForm.hourlyRate} min={0}
                    onChange={e => setLawyerForm(f => ({ ...f, hourlyRate: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Specialization</label>
                <select
                  value={lawyerForm.specialization}
                  onChange={e => setLawyerForm(f => ({ ...f, specialization: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Languages</label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES_LIST.map(lang => (
                    <button
                      key={lang} type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        lawyerForm.languages.includes(lang) ? "bg-primary/20 text-primary border border-primary/40" : "border border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Bio (optional)</label>
                <textarea
                  value={lawyerForm.bio}
                  onChange={e => setLawyerForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={2} placeholder="Brief professional bio..."
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-secondary/80">
                  Back
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-lg gold-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Complete"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
