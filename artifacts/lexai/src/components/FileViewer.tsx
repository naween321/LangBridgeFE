import { useEffect, useState } from "react";
import { X, Download, Loader2, FileText, AlertCircle } from "lucide-react";
import mammoth from "mammoth";

interface FileViewerProps {
  url: string;
  fileName: string;
  extension: string;
  onClose: () => void;
}

type ViewerState =
  | { status: "loading" }
  | { status: "pdf"; blobUrl: string }
  | { status: "docx"; html: string }
  | { status: "error"; message: string };

const PDF_EXTS = new Set(["pdf"]);
const DOCX_EXTS = new Set(["doc", "docx"]);

export function canPreview(extension: string) {
  const e = extension.toLowerCase().replace(/^\./, "");
  return PDF_EXTS.has(e) || DOCX_EXTS.has(e);
}

export default function FileViewer({ url, fileName, extension, onClose }: FileViewerProps) {
  const ext = extension.toLowerCase().replace(/^\./, "");
  const [state, setState] = useState<ViewerState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (PDF_EXTS.has(ext)) {
          // Use the URL directly in the iframe — no fetch or CORS needed.
          // The Django dev server must not have X-Frame-Options: DENY, which is
          // handled by removing XFrameOptionsMiddleware in DEBUG settings.
          if (!cancelled) setState({ status: "pdf", blobUrl: url });
          return;
        }

        if (DOCX_EXTS.has(ext)) {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (!cancelled) setState({ status: "docx", html: result.value });
          return;
        }

        setState({ status: "error", message: "Preview is not available for this file type." });
      } catch (err: any) {
        if (!cancelled) setState({ status: "error", message: err.message || "Failed to load document." });
      }
    }

    load();

    return () => { cancelled = true; };
  }, [url, ext]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm font-medium text-foreground truncate">{fileName}</span>
        <a
          href={url}
          download={fileName}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewer body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {state.status === "loading" && (
          <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading document…</span>
          </div>
        )}

        {state.status === "pdf" && (
          <iframe
            src={state.blobUrl}
            title={fileName}
            className="w-full h-full border-0"
          />
        )}

        {state.status === "docx" && (
          <div className="h-full overflow-y-auto bg-white">
            <div
              className="max-w-4xl mx-auto px-8 py-10 prose prose-sm"
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground px-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm">{state.message}</p>
            <a
              href={url}
              download={fileName}
              className="mt-2 px-4 py-2 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              Download file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
