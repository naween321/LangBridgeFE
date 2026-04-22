import { Link } from "wouter";
import { Scale, Mail, MapPin, Clock } from "lucide-react";

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Decorator */}
      <div className="absolute top-0 w-full h-[500px] bg-primary/5 [mask-image:linear-gradient(to_bottom,white,transparent)] -z-10" />

      {/* Header */}
      <header className="px-6 py-4 border-b border-border/50 flex flex-wrap items-center justify-between z-10 bg-background/80 backdrop-blur-md">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity">LexAI</span>
          </div>
        </Link>
        <div className="hidden md:flex items-center justify-center space-x-6 text-sm font-medium">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Product</Link>
          <Link href="/dictionary" className="text-muted-foreground hover:text-primary transition-colors">Legal Dictionary</Link>
          <Link href="/contact" className="text-primary gold-text font-semibold">Contact Us</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-foreground hover:text-primary font-medium transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-lg gold-gradient text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap">
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-20 px-6 z-10 w-full max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 w-full">

          {/* Left Column */}
          <div className="flex flex-col justify-center space-y-8">
            <div>
              <p className="text-sm font-semibold tracking-wider text-primary uppercase flex items-center gap-2 mb-4">
                <span className="w-6 h-px bg-primary" /> LexAI Legal Research
              </p>
              <h1 className="text-6xl md:text-8xl font-serif font-bold text-foreground leading-[1.1] mb-6 tracking-tight">
                Let's <br /> <span className="gold-text italic">Connect.</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                Our team is available to answer your questions, discuss partnerships, or help you navigate legal research platform.
              </p>
            </div>

            <div className="pt-8 border-t border-border/50">
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">First Name</label>
                    <input type="text" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Last Name</label>
                    <input type="text" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input type="email" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Message</label>
                  <textarea className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm min-h-[120px]" placeholder="How can we help you?"></textarea>
                </div>
                <button type="submit" className="px-6 py-2.5 rounded-lg gold-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto">
                  Send Message
                </button>
              </form>
            </div>
          </div>

          {/* Right Column / Quick Reference Card */}
          <div className="flex items-center justify-center md:justify-end">
            <div className="w-full max-w-md bg-card/60 backdrop-blur-sm border border-primary/20 rounded-2xl p-8 lg:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />

              <h2 className="text-xs font-bold tracking-widest text-primary uppercase mb-10 relative z-10">
                Quick Reference
              </h2>

              <div className="space-y-8 relative z-10">
                {/* Primary Contact */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Primary Contact
                  </h3>
                  <a href="mailto:mail@lexai.org" className="text-lg font-medium text-foreground hover:text-primary transition-colors block">
                    mail@lexai.org
                  </a>
                </div>

                <div className="h-px w-full bg-border/50" />

                {/* Support & Technical */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Support & Technical
                  </h3>
                  <a href="mailto:support@lexai.org" className="text-lg font-medium text-foreground hover:text-primary transition-colors block">
                    support@lexai.org
                  </a>
                </div>

                <div className="h-px w-full bg-border/50" />

                {/* Response Time */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Response Time
                  </h3>
                  <p className="text-lg font-medium text-foreground">
                    Within 24–48 business hours
                  </p>
                </div>
              </div>

              {/* Location Badge */}
              <div className="mt-12 pt-6 border-t border-primary/20 relative z-10">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-primary/30 bg-primary/5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">MA, US</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
