import { useState, useRef, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import Swal from "sweetalert2";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/auth";
import { useAuthenticatedQuery } from "@/lib/useAuthenticatedQuery";
import FileViewer, { canPreview } from "@/components/FileViewer";
import {
  useGetProjects, useCreateProject, useGetProjectThreads,
  useGetThreadDetail, useCreateThreadQuery, useCreateProjectQuery,
  useCreateStandaloneQuery, useGetDocuments, useGetIndependentThreads, useUploadMultipleFiles,
  getGetProjectsQueryKey, getGetProjectThreadsQueryKey, getGetThreadDetailQueryKey, getGetIndependentThreadsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, MessageSquare, Send, FileText, Bot, User,
  AlertCircle, Loader2, Paperclip, ChevronDown, Folder, 
  Library, Sparkles, Languages, Zap, Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ChatPage() {
  const { token } = useAuth();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const initialThread = params.get("thread");
  const initialProject = params.get("project");

  const [selectedProject, setSelectedProject] = useState<string | null>(initialProject);
  const [selectedThread, setSelectedThread] = useState<string | null>(initialThread);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [category, setCategory] = useState<"translate" | "simplify" | "recommendation">("simplify");
  const [uploadedFiles, setUploadedFiles] = useState<{id: number, name: string}[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [viewerFile, setViewerFile] = useState<{ url: string; fileName: string; extension: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // API Hooks using explicit Authorization headers
  const { data: projects, isLoading: projectsLoading } = useAuthenticatedQuery(
    useGetProjects, token
  );
  const { data: independentThreads, isLoading: independentLoading } = useAuthenticatedQuery(
    useGetIndependentThreads, token
  );
  const { data: docs } = useAuthenticatedQuery(useGetDocuments, token);
  
  const { data: threads, isLoading: threadsLoading } = useAuthenticatedQuery(
    useGetProjectThreads, token, selectedProject!, { query: { enabled: !!selectedProject } }
  );

  const { data: threadDetail, isLoading: detailLoading } = useAuthenticatedQuery(
    useGetThreadDetail, token, selectedThread!, { query: { enabled: !!selectedThread } }
  );

  const mutationHeaders = {
    request: { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  };

  const createProject = useCreateProject(mutationHeaders);
  const createProjectQuery = useCreateProjectQuery(mutationHeaders);
  const createThreadQuery = useCreateThreadQuery(mutationHeaders);
  const createStandaloneQuery = useCreateStandaloneQuery(mutationHeaders);
  const uploadFilesObj = useUploadMultipleFiles(mutationHeaders);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadDetail?.queries]);

  const handleDeleteThread = (e: React.MouseEvent, threadId: string, isIndependent: boolean, projectId: string | null) => {
    e.stopPropagation();
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this! The thread will be permanently deleted.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/assistant/thread/${threadId}/detail/`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.status === 204 || res.ok) {
            Swal.fire('Deleted!', 'The thread has been deleted.', 'success');
            if (isIndependent) {
              qc.invalidateQueries({ queryKey: getGetIndependentThreadsQueryKey() });
            } else if (projectId) {
              qc.invalidateQueries({ queryKey: getGetProjectThreadsQueryKey(projectId) });
            }
            if (selectedThread === threadId) {
              setSelectedThread(null);
            }
          } else {
             Swal.fire('Failed!', 'Failed to delete the thread.', 'error');
          }
        } catch (err) {
          Swal.fire('Error!', 'An error occurred.', 'error');
        }
      }
    });
  };

  const handleNewProject = async () => {
    const name = prompt("Project Name:", "New Legal Project");
    if (!name) return;
    try {
      const result = await createProject.mutateAsync({ data: { name } });
      setSelectedProject(result.id);
      setSelectedThread(null);
      qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() });
    } catch (err) {
      console.error("Failed to create project", err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      Array.from(e.target.files).forEach(f => formData.append('files', f));
      
      const res = await fetch('http://127.0.0.1:8000/api/assistant/files/upload/', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
         const data = await res.json();
         setUploadedFiles(prev => [...prev, ...data.files.map((f: any) => ({id: f.id, name: f.name}))]);
      }
    } catch(e) {
      console.error('File upload failed', e);
    }
    setIsUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    const queryData = {
      context: content || null,
      category,
      files: uploadedFiles.map(f => f.id),
      ...(category === "translate" ? { target_language: targetLanguage } : {}),
    };

    try {
      if (selectedThread) {
        await createThreadQuery.mutateAsync({
          threadUuid: selectedThread.toString(),
          data: queryData as any,
        });
        qc.invalidateQueries({ queryKey: getGetThreadDetailQueryKey(selectedThread.toString()) });
      } else if (selectedProject) {
        const result = await createProjectQuery.mutateAsync({
          projectUuid: selectedProject.toString(),
          data: {
            ...queryData,
            thread_title: content ? content.slice(0, 40) + "..." : `${targetLanguage} Translation`,
          } as any,
        });
        setSelectedThread((result as any).thread);
        qc.invalidateQueries({ queryKey: getGetProjectThreadsQueryKey(selectedProject.toString()) });
      } else {
        const result = await createStandaloneQuery.mutateAsync({
          data: queryData as any,
        });
        setSelectedThread((result as any).thread);
        qc.invalidateQueries({ queryKey: getGetIndependentThreadsQueryKey() });
      }
      setUploadedFiles([]);
    } catch (err) {
      console.error("Failed to send query", err);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {viewerFile && (
        <FileViewer
          url={viewerFile.url}
          fileName={viewerFile.fileName}
          extension={viewerFile.extension}
          onClose={() => setViewerFile(null)}
        />
      )}
      {/* 1. Project Sidebar (Left) */}
      <div className="w-16 lg:w-64 flex flex-col border-r border-border bg-card/40 backdrop-blur-xl shrink-0 z-20 transition-all duration-300">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="hidden lg:block text-xs font-bold uppercase tracking-wider text-muted-foreground">Projects</h3>
          <button
            onClick={handleNewProject}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="New Project"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Standalone Option */}
          <button
            onClick={() => { setSelectedProject(null); setSelectedThread(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
              !selectedProject && !selectedThread ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-secondary/80 text-foreground"
            }`}
          >
            <Sparkles className={`w-4 h-4 shrink-0 transition-transform group-hover:rotate-12 ${!selectedProject && !selectedThread ? "" : "text-primary"}`} />
            <span className="hidden lg:block text-sm font-medium truncate">Quick Inquiry</span>
          </button>

          <div className="my-2 border-t border-border/50 mx-2" />

          {projectsLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : (
            ((projects as any)?.results || projects || [])?.map((p: any) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProject(p.id); setSelectedThread(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  selectedProject === p.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-secondary/80 text-foreground"
                }`}
              >
                <Folder className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${selectedProject === p.id ? "" : "text-primary"}`} />
                <span className="hidden lg:block text-sm font-medium truncate">{p.name}</span>
              </button>
            ))
          )}

          {/* Independent Threads */}
          <div className="my-2 border-t border-border/50 mx-2" />
          <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:block">Independent Chats</h3>
          
          {independentLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : (
            ((independentThreads as any)?.results || independentThreads || [])?.map((t: any) => (
              <div
                key={t.id}
                onClick={() => { setSelectedProject(null); setSelectedThread(t.id); }}
                className={`w-full cursor-pointer flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  selectedThread === t.id && !selectedProject ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-secondary/80 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${selectedThread === t.id && !selectedProject ? "" : "text-muted-foreground"}`} />
                  <span className="hidden lg:block text-sm font-medium truncate">{t.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteThread(e, t.id, true, null)}
                  className={`p-1 rounded hover:bg-destructive hover:text-white transition-all hidden lg:flex ${selectedThread === t.id && !selectedProject ? "text-primary-foreground/70" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`}
                  title="Delete Thread"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Thread Sidebar (Middle) */}
      <AnimatePresence mode="wait">
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-64 flex flex-col border-r border-border bg-card/20 backdrop-blur-md shrink-0 z-10"
          >
            <div className="p-4 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Threads</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {threadsLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
              ) : !threads || ((threads as any)?.results || threads).length === 0 ? (
                <div className="text-center p-4 text-xs text-muted-foreground">No threads found in this project</div>
              ) : (
                ((threads as any)?.results || threads)?.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedThread(t.id)}
                    className={`w-full group cursor-pointer flex flex-row items-center justify-between gap-1 px-3 py-3 rounded-xl text-left transition-all ${
                      selectedThread === t.id ? "bg-card border border-border shadow-md" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${selectedThread === t.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold truncate">{t.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteThread(e, t.id, false, selectedProject)}
                      className={`p-1 rounded shrink-0 transition-all hover:bg-destructive hover:text-white flex ${selectedThread === t.id ? "text-muted-foreground" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`}
                      title="Delete Thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-0">
        <div className="flex-1 flex flex-col h-full bg-background rounded-l-2xl shadow-2xl relative overflow-hidden">
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border glass-header flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Library className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {selectedThread 
                      ? (threadDetail?.title || "Conversation")
                      : (((projects as any)?.results || projects || [])?.find((p: any) => p.id === selectedProject)?.name || "New Inquiry")
                    }
                  </h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Project: {((projects as any)?.results || projects || [])?.find((p: any) => p.id === selectedProject)?.name || "Standalone"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {!selectedThread && (
                <div className="flex-1 flex flex-col items-center justify-center h-full text-center opacity-60">
                   <Sparkles className="w-12 h-12 text-primary/40 mb-4 animate-pulse" />
                   <h3 className="text-lg font-bold">Ready for analysis</h3>
                   <p className="text-sm max-w-xs">{selectedProject ? "Ask your first question in this project to start a new analysis thread." : "Ask a quick question to start a new independent chat."}</p>
                </div>
              )}
              {selectedThread && detailLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                (threadDetail?.queries ? [...threadDetail.queries].reverse() : []).map((q: any) => (
                  <div key={q.id} className="space-y-6">
                    {/* User Query */}
                    <div className="flex justify-end pr-4">
                      <div className="max-w-[85%] bg-primary text-primary-foreground px-5 py-3.5 rounded-2xl rounded-tr-none shadow-lg shadow-primary/20 text-sm">
                        {q.context && <div>{q.context}</div>}
                        
                        {q.files && q.files.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {q.files.map((f: any) => {
                              const ext = f.name.split('.').pop() || '';
                              const commonCls = "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors text-[10px] font-bold max-w-[200px]";
                              return canPreview(ext) ? (
                                <button
                                  key={f.id}
                                  onClick={() => setViewerFile({ url: f.url, fileName: f.name, extension: ext })}
                                  className={commonCls}
                                >
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{f.name}</span>
                                </button>
                              ) : (
                                <a
                                  key={f.id}
                                  href={f.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={commonCls}
                                >
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{f.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {q.category && (
                          <div className="mt-2 text-[10px] opacity-70 flex items-center gap-1 font-bold uppercase">
                            <Sparkles className="w-2.5 h-2.5" /> {q.category}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* AI Answer */}
                    <AnimatePresence>
                      {q.answer && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-4 pr-12"
                        >
                          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border shadow-sm">
                            <Bot className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="bg-card border border-border px-5 py-4 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed text-foreground w-full overflow-hidden">
                            <div className="legal-prose">
                              <ReactMarkdown
                                components={{
                                  a: ({ node, ...props }) => {
                                    const href = props.href || "";
                                    const ext = href.split('.').pop() || "";
                                    if (canPreview(ext)) {
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            setViewerFile({
                                              url: href,
                                              fileName: href.split('/').pop() || "document",
                                              extension: ext,
                                            });
                                          }}
                                          className="text-primary underline decoration-primary/50 hover:opacity-80 transition-opacity"
                                        >
                                          {props.children}
                                        </button>
                                      );
                                    }
                                    return (
                                      <a
                                        {...props}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline decoration-primary/50 hover:opacity-80 transition-opacity"
                                      />
                                    );
                                  }
                                }}
                              >
                                {q.answer.text}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex gap-4 pr-12 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="bg-card border border-border px-5 py-4 rounded-2xl rounded-tl-none text-sm text-muted-foreground flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing legal inquiry...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Section */}
            <div className="p-6 border-t border-border bg-gradient-to-t from-card/30 to-transparent">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Category Toggles */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
                  {[
                    { id: "simplify", icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                    { id: "translate", icon: Languages, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { id: "recommendation", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10" }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        category === cat.id
                          ? `${cat.bg} border-primary/20 text-foreground`
                          : "border-transparent text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
                      <span className="capitalize">{cat.id}</span>
                    </button>
                  ))}

                  {/* Language selector — visible only in translate mode */}
                  {category === "translate" && (
                    <div className="flex items-center gap-1.5 ml-1">
                      <Languages className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                        <SelectTrigger className="h-8 text-xs font-semibold bg-blue-500/10 border-blue-500/20 rounded-full px-3 w-[150px] focus:ring-2 focus:ring-blue-500/30">
                          <SelectValue placeholder="Language" />
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
                  )}
                </div>

                {/* Input Tray */}
                <div className="relative group">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      category === "translate" && uploadedFiles.length > 0
                        ? `Optional: add any instructions for the ${targetLanguage} translation...`
                        : "Describe your case or ask a specific question..."
                    }
                    className="w-full bg-card/60 backdrop-blur-md border border-border rounded-2xl px-5 py-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[100px] shadow-sm transition-all group-hover:border-primary/30"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile}
                      className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all relative disabled:opacity-50 group-hover:text-primary"
                    >
                      {isUploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                      {!isUploadingFile && uploadedFiles.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                          {uploadedFiles.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={(!input.trim() && uploadedFiles.length === 0) || sending || isUploadingFile}
                      className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Attached Files List directly below input */}
                  {uploadedFiles.length > 0 && (
                    <div className="absolute top-full mt-2 right-0 left-0 flex flex-wrap gap-2 justify-end pr-1">
                      {uploadedFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-[10px] font-bold text-muted-foreground max-w-[200px]">
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">{f.name}</span>
                          <button 
                            onClick={() => setUploadedFiles(prev => prev.filter(file => file.id !== f.id))}
                            className="ml-1 hover:text-destructive shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold px-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  LexAI Assistant is in beta. Verify critical legal actions with an attorney.
                </div>
              </div>
            </div>
          </>
        </div>
      </div>
    </div>
  );
}
