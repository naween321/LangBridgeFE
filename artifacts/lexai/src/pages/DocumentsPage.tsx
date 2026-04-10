import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import {
  useGetDocuments, useUploadDocument, useDeleteDocument, useAnalyzeDocument,
  getGetDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Trash2, Loader2, X, Zap, Languages, AlertCircle, Search } from "lucide-react";
import { Link } from "wouter";

const ACTIONS = [
  { key: "summarize", label: "Summarize", icon: FileText },
  { key: "simplify", label: "Simplify", icon: Zap },
  { key: "detect_risks", label: "Detect Risks", icon: AlertCircle },
  { key: "translate", label: "Translate", icon: Languages },
];

export default function DocumentsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ docId: number; result: string; action: string } | null>(null);
  const [targetLang, setTargetLang] = useState("Spanish");

  const { data: docs, isLoading } = useGetDocuments({ query: { enabled: !!token } });
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const analyze = useAnalyzeDocument();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string || "");
        reader.readAsText(file);
      });
      await upload.mutateAsync({
        data: {
          name: file.name,
          fileType: file.name.split(".").pop() || "txt",
          fileSize: file.size,
          content: content.slice(0, 5000),
        },
      });
      qc.invalidateQueries({ queryKey: getGetDocumentsQueryKey() });
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this document?")) return;
    await remove.mutateAsync({ documentId: id });
    qc.invalidateQueries({ queryKey: getGetDocumentsQueryKey() });
    if (analysisResult?.docId === id) setAnalysisResult(null);
  };

  const handleAnalyze = async (docId: number, action: string) => {
    setAnalyzing(docId);
    try {
      const result = await analyze.mutateAsync({
        documentId: docId,
        data: { action: action as any, targetLanguage: action === "translate" ? targetLang : undefined },
      });
      setAnalysisResult({ docId, result: (result as any).result, action });
    } catch {}
    setAnalyzing(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1 text-sm">Upload legal documents for AI analysis.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Document
          </button>
          <p className="text-xs text-muted-foreground mt-1 text-right">PDF, TXT, JPG, PNG</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !docs || (docs as any[]).length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No documents yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload a legal document to get started with AI analysis</p>
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90">
            Upload Your First Document
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {(docs as any[]).map((doc: any) => (
            <div key={doc.id} className="border border-border rounded-xl bg-card/50 overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.fileType.toUpperCase()} · {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : "—"} · {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/chat`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-foreground hover:bg-secondary/80 transition-colors">
                    <Search className="w-3.5 h-3.5" />
                    Ask AI
                  </Link>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-4">
                <p className="text-xs text-muted-foreground mb-2">Quick Analysis:</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center gap-1">
                      {key === "translate" && (
                        <select
                          value={targetLang}
                          onChange={e => setTargetLang(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none"
                        >
                          {["Spanish", "French", "Arabic", "Chinese", "Portuguese"].map(l => <option key={l}>{l}</option>)}
                        </select>
                      )}
                      <button
                        onClick={() => handleAnalyze(doc.id, key)}
                        disabled={analyzing === doc.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-60"
                      >
                        {analyzing === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5 text-primary" />}
                        {label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {analysisResult?.docId === doc.id && (
                <div className="mx-4 mb-4 p-4 rounded-lg bg-background border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">{analysisResult.action}</p>
                    <button onClick={() => setAnalysisResult(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{analysisResult.result}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
