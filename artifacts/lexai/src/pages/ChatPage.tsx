import { useState, useRef, useEffect } from "react";
import { useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useGetChatSessions, useCreateChatSession, useGetChatSession,
  useDeleteChatSession, useSendMessage, useGetDocuments,
  getGetChatSessionsQueryKey, getGetChatSessionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, MessageSquare, Send, FileText, Bot, User,
  AlertCircle, Loader2, Paperclip, ChevronDown
} from "lucide-react";

export default function ChatPage() {
  const { token } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialSession = params.get("session");

  const [selectedSession, setSelectedSession] = useState<number | null>(initialSession ? parseInt(initialSession) : null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: sessions, isLoading: sessionsLoading } = useGetChatSessions({ query: { enabled: !!token } });
  const { data: docs } = useGetDocuments({ query: { enabled: !!token } });
  const { data: sessionDetail, isLoading: detailLoading } = useGetChatSession(
    selectedSession!,
    { query: { enabled: !!selectedSession } }
  );

  const createSession = useCreateChatSession();
  const deleteSession = useDeleteChatSession();
  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionDetail?.messages]);

  const handleNewChat = async () => {
    const result = await createSession.mutateAsync({ title: "New Legal Chat" });
    setSelectedSession(result.id);
    qc.invalidateQueries({ queryKey: getGetChatSessionsQueryKey() });
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession.mutateAsync({ sessionId: id });
    if (selectedSession === id) setSelectedSession(null);
    qc.invalidateQueries({ queryKey: getGetChatSessionsQueryKey() });
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedSession || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendMessage.mutateAsync({ sessionId: selectedSession, data: { content, documentId: selectedDocId || undefined } });
      qc.invalidateQueries({ queryKey: getGetChatSessionQueryKey(selectedSession) });
      qc.invalidateQueries({ queryKey: getGetChatSessionsQueryKey() });
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = sessionDetail?.messages || [];

  return (
    <div className="flex h-full">
      {/* Session Sidebar */}
      <div className="w-64 flex flex-col border-r border-border bg-card/30 shrink-0">
        <div className="p-3 border-b border-border">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!sessionsLoading && (!sessions || sessions.length === 0) && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No chats yet. Start one!
            </div>
          )}
          {sessions?.map((s: any) => (
            <div
              key={s.id}
              onClick={() => setSelectedSession(s.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
                selectedSession === s.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/80 text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground truncate">{s.messageCount} messages</p>
              </div>
              <button
                onClick={(e) => handleDelete(s.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">AI Legal Assistant</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Ask questions about legal documents, get plain-English explanations, identify risks, and more.
              </p>
              <button onClick={handleNewChat} className="px-5 py-2.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                Start New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{sessionDetail?.title || "Chat"}</p>
                {selectedDocId && docs && (
                  <p className="text-xs text-muted-foreground">
                    Attached: {docs.find((d: any) => d.id === selectedDocId)?.name}
                  </p>
                )}
              </div>
              {/* Doc Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowDocPicker(s => !s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {selectedDocId && docs ? docs.find((d: any) => d.id === selectedDocId)?.name?.slice(0, 15) + "..." : "Attach Doc"}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showDocPicker && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    <div className="p-1">
                      <button
                        onClick={() => { setSelectedDocId(null); setShowDocPicker(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/80 rounded"
                      >
                        No document
                      </button>
                      {docs?.map((d: any) => (
                        <button
                          key={d.id}
                          onClick={() => { setSelectedDocId(d.id); setShowDocPicker(false); }}
                          className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-secondary/80 rounded flex items-center gap-2"
                        >
                          <FileText className="w-3 h-3 text-primary" />
                          <span className="truncate">{d.name}</span>
                        </button>
                      ))}
                      {(!docs || docs.length === 0) && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No documents uploaded</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {detailLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!detailLoading && messages.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Send a message to start the conversation
                </div>
              )}
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-primary/20" : "bg-secondary"
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className={`flex-1 max-w-xl ${msg.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-card border border-border text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Disclaimer */}
            <div className="px-4 py-2 border-t border-border bg-card/20">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>LexAI provides general legal information only. Always consult a qualified attorney for legal advice.</span>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a legal question..."
                  className="flex-1 px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="px-4 rounded-xl gold-gradient text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
