import { useState } from "react";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import { Search, Scale, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DICTIONARY_TERMS = [
  {
    term: "Affidavit",
    definition: "A written statement confirmed by oath or affirmation, for use as evidence in court.",
  },
  {
    term: "Subpoena",
    definition: "A writ ordering a person to attend a court.",
  },
  {
    term: "Deposition",
    definition: "The process of giving sworn evidence.",
  },
  {
    term: "Injunction",
    definition: "An authoritative warning or order, a judicial order that restrains a person from beginning or continuing an action threatening or invading the legal right of another.",
  },
  {
    term: "Habeas Corpus",
    definition: "A writ requiring a person under arrest to be brought before a judge or into court, especially to secure the person's release unless lawful grounds are shown for their detention.",
  },
  {
    term: "Tort",
    definition: "A wrongful act or an infringement of a right (other than under contract) leading to civil legal liability.",
  },
  {
    term: "Pro bono",
    definition: "Denoting work undertaken for the public good without charge, especially legal work for a client with a low income.",
  },
  {
    term: "Due process",
    definition: "Fair treatment through the normal judicial system, especially as a citizen's entitlement.",
  },
];

export default function FreeToolsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [terms, setTerms] = useState(DICTIONARY_TERMS);
  const [isFinding, setIsFinding] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<{term: string, definition: string} | null>(null);

  const filteredTerms = terms.filter((item) => {
    return item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.definition.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAskAI = async () => {
    if (!searchTerm) return;
    setIsFinding(true);
    
    try {
      const backendUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${backendUrl}/api/assistant/dictionary/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legal_term: searchTerm }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch meaning");
      }

      const data = await res.json();
      
      const meaningText = typeof data === "string" ? data : (data.explanation || data.meaning || data.definition || "No explicit definition provided by the AI.");
      
      const newTerm = {
        term: searchTerm,
        definition: meaningText,
      };
      
      setTerms((prev) => [newTerm, ...prev]);
      setSearchTerm("");
      setSelectedTerm(newTerm); // Instantly show the meaning in the modal
    } catch (error) {
      console.error(error);
      alert("Could not fetch the meaning from the AI at this time.");
    } finally {
      setIsFinding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
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
          <Link href="/dictionary" className="text-primary gold-text font-semibold">Legal Dictionary</Link>
          <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</Link>
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

      {/* Hero Section */}
      <div className="px-6 py-20 bg-secondary/20 border-b border-border/50 flex flex-col items-center">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> LexAI Tools
          </p>
          <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight text-foreground">
            Legal Dictionary
          </h1>
          <h2 className="text-3xl italic text-muted-foreground font-serif">for You</h2>
          <p className="text-muted-foreground pt-4 leading-relaxed px-4">
            A comprehensive glossary of legal terms for easy reference.
          </p>
        </div>
      </div>

      {/* Dictionary Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">
        
        {/* Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/30">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search legal terms..." 
              className="pl-9 bg-background border-input w-full rounded-lg"
            />
          </div>
          <div className="flex items-center self-end md:self-auto gap-4">
            {searchTerm && (
              <button 
                onClick={handleAskAI}
                disabled={isFinding}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap border border-primary/20"
              >
                {isFinding ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Ask AI</>
                )}
              </button>
            )}
            <span className="text-sm text-muted-foreground whitespace-nowrap">{filteredTerms.length} TERMS</span>
          </div>
        </div>

        {/* Dictionary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredTerms.map((item, index) => (
            <div 
              key={index} 
              onClick={() => setSelectedTerm(item)}
              className="p-6 cursor-pointer rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/40 transition-all duration-300 shadow-sm flex flex-col h-full"
            >
              <h3 className="font-bold text-xl mb-4 text-foreground">{item.term}</h3>
              <div className="line-clamp-3 text-sm text-foreground/80 leading-relaxed flex-1 overflow-hidden [&>p]:mb-0">
                <ReactMarkdown>{item.definition}</ReactMarkdown>
              </div>
            </div>
          ))}
          {filteredTerms.length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-6">No terms found matching "{searchTerm}".</p>
              
              <button 
                onClick={handleAskAI}
                disabled={isFinding}
                className="px-6 py-2.5 rounded-lg gold-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-70"
              >
                {isFinding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Ask AI for Meaning
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Dictionary Term Modal */}
      <Dialog open={!!selectedTerm} onOpenChange={(open) => !open && setSelectedTerm(null)}>
        <DialogContent className="max-w-md sm:max-w-lg bg-card/95 backdrop-blur border border-primary/20 p-6 md:p-8 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-serif text-foreground mb-4">
              {selectedTerm?.term}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="text-[15px] leading-relaxed text-muted-foreground [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:mb-1 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:mb-1 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:text-foreground [&>h4]:font-semibold [&>strong]:text-foreground [&>strong]:font-bold">
              <ReactMarkdown>{selectedTerm?.definition || ""}</ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
