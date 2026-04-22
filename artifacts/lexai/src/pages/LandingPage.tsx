import { Link } from "wouter";
import { Scale, Shield, Users, FileText, MessageSquare, Star, Check, ArrowRight, Zap } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Legal Assistant",
    desc: "Chat with our AI to understand legal documents, get plain-English explanations, and identify risks instantly.",
  },
  {
    icon: FileText,
    title: "Document Analysis",
    desc: "Upload contracts, leases, or any legal document. Our AI extracts key clauses, flags risks, and simplifies complex language.",
  },
  {
    icon: Users,
    title: "LawyerNet Marketplace",
    desc: "Connect with verified attorneys. Browse by specialization, read reviews, chat directly, and schedule video consultations.",
  },
  {
    icon: Shield,
    title: "Verified Lawyers",
    desc: "Every lawyer on our platform is verified with bar credentials and background checks before they can practice.",
  },
  {
    icon: Zap,
    title: "Instant Answers",
    desc: "No waiting rooms. Get instant AI-powered responses to your legal questions, any time, from anywhere.",
  },
  {
    icon: Star,
    title: "Multi-Language Support",
    desc: "Legal assistance in English, Spanish, French, Arabic, and Chinese. Documents translated on demand.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["2 document uploads per day", "10 AI queries per day", "Access to LawyerNet directory", "Basic chat support"],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "$10",
    period: "per month",
    features: ["Unlimited document uploads", "Unlimited AI queries", "Priority AI responses", "Document translation", "Advanced risk detection", "Priority lawyer matching"],
    cta: "Start Premium",
    highlighted: true,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">LexAI</span>
        </div>
        <div className="hidden md:flex items-center justify-center space-x-6 text-sm font-medium">
          <Link href="/" className="text-primary gold-text font-semibold">Product</Link>
          <Link href="/dictionary" className="text-muted-foreground hover:text-primary transition-colors">Legal Dictionary</Link>
          <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-lg gold-gradient text-primary-foreground hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-8">
          <Zap className="w-3 h-3" />
          AI-Powered Legal Intelligence
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Legal clarity,{" "}
          <span className="gold-text">without the</span>
          <br />hourly rate
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          LexAI gives you instant AI-powered legal analysis, document understanding, and access to verified attorneys — all in one platform.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="flex items-center gap-2 px-6 py-3 rounded-lg gold-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-sm">
            Start for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-secondary/80 transition-colors text-sm">
            Sign In
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">No credit card required. Free plan available.</p>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything you need to understand the law</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            From document analysis to attorney consultations, LexAI is your complete legal intelligence platform.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card/50 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
        <p className="text-muted-foreground text-center mb-12">Start free, upgrade when you need more.</p>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-8 rounded-xl border ${plan.highlighted
                ? "border-primary/60 bg-primary/5 relative"
                : "border-border bg-card/50"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full gold-gradient text-primary-foreground text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-bold text-primary">{plan.price}</span>
                <span className="text-sm text-muted-foreground mb-1">/{plan.period}</span>
              </div>
              <ul className="space-y-2.5 mt-6 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-opacity ${
                  plan.highlighted
                    ? "gold-gradient text-primary-foreground hover:opacity-90"
                    : "border border-border text-foreground hover:bg-secondary/80"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Scale className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">LexAI</span>
        </div>
        <p>LexAI provides general legal information, not legal advice. Always consult a qualified attorney for legal matters.</p>
        <p className="mt-1">© 2026 LexAI. All rights reserved.</p>
      </footer>
    </div>
  );
}
