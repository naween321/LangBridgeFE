import { useState, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthenticatedQuery } from "@/lib/useAuthenticatedQuery";
import {
  useGetDocuments, useDeleteDocument, useAnalyzeDocument,
  getGetDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Upload, FileText, Trash2, Loader2, X, Zap, Languages, AlertCircle, 
  Search, Grid, List, Folder, File, Image as ImageIcon, Clock, 
  MoreVertical, Plus, MessageSquare, Sparkles
} from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import FileViewer, { canPreview } from "@/components/FileViewer";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const ACTIONS = [
  { key: "summarize", label: "Summarize", icon: FileText },
  { key: "simplify", label: "Simplify", icon: Zap },
  { key: "detect_risks", label: "Detect Risks", icon: AlertCircle },
  { key: "translate", label: "Translate", icon: Languages },
];

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null) return "—";
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / 1048576).toFixed(1) + " MB";
}

export default function DocumentsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ docId: number; result: string; action: string } | null>(null);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [viewerFile, setViewerFile] = useState<{ url: string; fileName: string; extension: string } | null>(null);
  
  const [filter, setFilter] = useState<"all" | "recent" | "pdf" | "image" | "text">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: docs, isLoading } = useAuthenticatedQuery(useGetDocuments, token);
  
  const mutationHeaders = {
    request: { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  };
  
  const remove = useDeleteDocument(mutationHeaders);
  const analyze = useAnalyzeDocument(mutationHeaders);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://127.0.0.1:8000/api/documents/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
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

  const allDocs = (docs as any)?.results || docs || [];
  
  const filteredDocs = useMemo(() => {
    let result = allDocs;
    if (searchQuery) {
      result = result.filter((d: any) => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filter === "recent") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      result = result.filter((d: any) => new Date(d.uploadedAt) > oneWeekAgo);
    } else if (filter === "pdf") {
      result = result.filter((d: any) => d.fileType.toLowerCase().includes("pdf"));
    } else if (filter === "image") {
      result = result.filter((d: any) => ["jpg", "jpeg", "png"].some(ext => d.fileType.toLowerCase().includes(ext)));
    } else if (filter === "text") {
      result = result.filter((d: any) => d.fileType.toLowerCase().includes("txt"));
    }
    return result;
  }, [allDocs, searchQuery, filter]);

  const NavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden relative font-sans w-full">
      {viewerFile && (
        <FileViewer
          url={viewerFile.url}
          fileName={viewerFile.fileName}
          extension={viewerFile.extension}
          onClose={() => setViewerFile(null)}
        />
      )}
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card/40 backdrop-blur-xl shrink-0 p-4 hidden md:flex flex-col z-10">
        <div className="mb-6 px-2">
          <h2 className="text-lg font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Folder className="w-5 h-5 text-primary" />
            My Files
          </h2>
        </div>
        
        <nav className="space-y-1">
          <NavItem icon={Folder} label="All Files" active={filter === 'all'} onClick={() => setFilter('all')} />
          <NavItem icon={Clock} label="Recent" active={filter === 'recent'} onClick={() => setFilter('recent')} />
          <div className="my-4 border-t border-border/50 mx-2" />
          <p className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-2 mt-4">Categories</p>
          <NavItem icon={FileText} label="Documents" active={filter === 'pdf'} onClick={() => setFilter('pdf')} />
          <NavItem icon={ImageIcon} label="Images" active={filter === 'image'} onClick={() => setFilter('image')} />
          <NavItem icon={File} label="Text" active={filter === 'text'} onClick={() => setFilter('text')} />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                 placeholder="Search files..." 
                 className="pl-9 bg-card/50 border-border h-9 text-sm focus-visible:ring-primary/30"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            <div className="hidden sm:flex items-center bg-secondary/50 rounded-lg p-1 border border-border/50">
              <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Grid className="w-4 h-4" /></button>
              <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-4 h-4" /></button>
            </div>
            
            <input ref={fileRef} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shadow-lg shadow-primary/20"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-secondary/5">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-border rounded-2xl bg-card/30 mt-8 max-w-2xl mx-auto">
              <Folder className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">No files found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {searchQuery ? "Try adjusting your search query." : "Upload your legal documents, images, or text files to get started."}
              </p>
              {!searchQuery && (
                <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80">
                  Upload Document
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {filter === 'all' ? 'All Files' : filter === 'recent' ? 'Recent Files' : `${filter} files`}
                </h3>
              </div>

              {view === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredDocs.map((doc: any) => (
                    <div 
                      key={doc.id} 
                      onClick={() => doc.fileUrl && (canPreview(doc.fileType) ? setViewerFile({ url: doc.fileUrl, fileName: doc.name, extension: doc.fileType }) : window.open(doc.fileUrl, '_blank'))}
                      className="group relative border border-border/80 rounded-xl bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                    >
                      <div className="aspect-video bg-secondary/30 flex items-center justify-center relative p-4">
                        {doc.fileType.toLowerCase().includes('pdf') ? (
                          <FileText className="w-12 h-12 text-red-500/80" />
                        ) : doc.fileType.toLowerCase().includes('image') || ["jpg", "jpeg", "png"].some(ext => doc.fileType.toLowerCase().includes(ext)) ? (
                          <ImageIcon className="w-12 h-12 text-blue-500/80" />
                        ) : (
                          <File className="w-12 h-12 text-primary/80" />
                        )}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md bg-background/80 hover:bg-background text-foreground shadow-sm backdrop-blur-sm">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {doc.fileUrl && (
                                <DropdownMenuItem 
                                  className="cursor-pointer gap-2" 
                                  onClick={() => canPreview(doc.fileType) ? setViewerFile({ url: doc.fileUrl, fileName: doc.name, extension: doc.fileType }) : window.open(doc.fileUrl, '_blank')}
                                >
                                  <Search className="w-4 h-4 text-primary" /> Open Document
                                </DropdownMenuItem>
                              )}
                              <Link href={`/chat`}>
                                <DropdownMenuItem className="cursor-pointer gap-2">
                                  <MessageSquare className="w-4 h-4 text-primary" /> Ask AI
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              {ACTIONS.map(action => (
                                <DropdownMenuItem key={action.key} onClick={() => handleAnalyze(doc.id, action.key)} className="cursor-pointer gap-2">
                                  <action.icon className="w-4 h-4 text-muted-foreground" />
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="font-semibold text-sm text-foreground truncate mb-1" title={doc.name}>{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium flex items-center justify-between mt-auto">
                          <span>{doc.fileType.toUpperCase()}</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                        </p>
                      </div>

                      {/* Quick Analysis Results Inline Display */}
                      {analysisResult?.docId === doc.id && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute inset-0 bg-background/95 backdrop-blur-sm p-4 flex flex-col z-20 overflow-y-auto">
                          <div className="flex justify-between items-center mb-3 sticky top-0 bg-background">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">{analysisResult.action}</span>
                            <button onClick={(e) => { e.stopPropagation(); setAnalysisResult(null); }} className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{analysisResult.result}</p>
                        </div>
                      )}
                      
                      {/* Loading State Overlay */}
                      {analyzing === doc.id && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                          <span className="text-xs font-bold text-primary animate-pulse">Analyzing...</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border/80">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Name</th>
                        <th className="px-6 py-3 font-semibold">Date Modified</th>
                        <th className="px-6 py-3 font-semibold">Size</th>
                        <th className="px-6 py-3 font-semibold">Kind</th>
                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredDocs.map((doc: any) => (
                        <tr 
                          key={doc.id} 
                          onClick={() => doc.fileUrl && (canPreview(doc.fileType) ? setViewerFile({ url: doc.fileUrl, fileName: doc.name, extension: doc.fileType }) : window.open(doc.fileUrl, '_blank'))}
                          className="hover:bg-secondary/20 transition-colors group relative cursor-pointer"
                        >
                          <td className="px-6 py-4 flex items-center gap-3">
                            {doc.fileType.toLowerCase().includes('pdf') ? (
                              <FileText className="w-5 h-5 text-red-500/80" />
                            ) : doc.fileType.toLowerCase().includes('image') || ["jpg", "jpeg", "png"].some(ext => doc.fileType.toLowerCase().includes(ext)) ? (
                              <ImageIcon className="w-5 h-5 text-blue-500/80" />
                            ) : (
                              <File className="w-5 h-5 text-primary/80" />
                            )}
                            <span className="font-semibold text-foreground truncate max-w-[200px]" title={doc.name}>{doc.name}</span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-muted-foreground">{formatFileSize(doc.fileSize)}</td>
                          <td className="px-6 py-4 text-muted-foreground">{doc.fileType.toUpperCase()}</td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {doc.fileUrl && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer gap-2" 
                                    onClick={() => canPreview(doc.fileType) ? setViewerFile({ url: doc.fileUrl, fileName: doc.name, extension: doc.fileType }) : window.open(doc.fileUrl, '_blank')}
                                  >
                                    <Search className="w-4 h-4 text-primary" /> Open Document
                                  </DropdownMenuItem>
                                )}
                                <Link href={`/chat`}>
                                  <DropdownMenuItem className="cursor-pointer gap-2">
                                    <MessageSquare className="w-4 h-4 text-primary" /> Ask AI
                                  </DropdownMenuItem>
                                </Link>
                                <DropdownMenuSeparator />
                                {ACTIONS.map(action => (
                                  <DropdownMenuItem key={action.key} onClick={() => handleAnalyze(doc.id, action.key)} className="cursor-pointer gap-2">
                                    <action.icon className="w-4 h-4 text-muted-foreground" />
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Analysis Result display for List View */}
                  {analysisResult && view === 'list' && (
                    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                       <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                          <div className="p-4 border-b border-border flex justify-between items-center">
                             <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-foreground uppercase tracking-widest">{analysisResult.action} Result</h3>
                             </div>
                             <button onClick={() => setAnalysisResult(null)} className="p-1 rounded-md hover:bg-secondary">
                               <X className="w-5 h-5" />
                             </button>
                          </div>
                          <div className="p-6 overflow-y-auto">
                             <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{analysisResult.result}</p>
                          </div>
                       </div>
                    </div>
                  )}
                  {analyzing && view === 'list' && (
                    <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center p-4">
                       <div className="bg-card border border-border shadow-2xl rounded-2xl p-8 flex flex-col items-center">
                          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                          <h3 className="font-bold text-foreground">Analyzing Document...</h3>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Target Language Selection Float */}
      <div className="fixed bottom-6 right-6 z-40 bg-card/90 backdrop-blur-md border border-border p-3 rounded-xl shadow-2xl flex items-center gap-3">
        <Languages className="w-4 h-4 text-blue-500" />
        <Select value={targetLang} onValueChange={setTargetLang}>
          <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border rounded-lg px-3 w-[130px]">
            <SelectValue placeholder="Target Language" />
          </SelectTrigger>
          <SelectContent>
            {[
              "Spanish", "French", "German", "Italian", "Portuguese",
              "Chinese (Simplified)", "Chinese (Traditional)", "Japanese",
              "Korean", "Arabic", "Russian", "Hindi", "Dutch",
              "Swedish", "Norwegian", "Danish", "Finnish", "Polish",
              "Turkish", "Vietnamese", "Thai", "Indonesian", "Malay",
              "Nepali", "Urdu", "Bengali", "Swahili"
            ].map(lang => (
              <SelectItem key={lang} value={lang} className="text-xs">
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
