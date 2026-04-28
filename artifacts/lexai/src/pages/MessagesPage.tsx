import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import FileViewer, { canPreview } from "@/components/FileViewer";
import {
  useGetConversations,
  useGetMessages,
  useSendMessage,
  useMarkMessagesRead,
  useGetAvailableLawyers,
  useCreateConversation,
  useDeleteConversation,
  chatKeys,
  type Conversation,
  type ChatMessage,
} from "@/hooks/useChatApi";
import { useConversationSocket } from "@/hooks/useConversationSocket";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Send, Loader2, ArrowLeft, CheckCheck, Check,
  Search, Circle, Paperclip, FileText, X, Trash2
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Date separator ──────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground px-1">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────

interface BubbleProps {
  msg: ChatMessage;
  isMe: boolean;
  showRead: boolean;
  myInitial: string;
  theirInitial: string;
}

function MessageBubble({ msg, isMe, showRead, myInitial, theirInitial }: BubbleProps) {
  const [viewerFile, setViewerFile] = useState<{ url: string; fileName: string; extension: string } | null>(null);

  return (
    <>
      {viewerFile && (
        <FileViewer
          url={viewerFile.url}
          fileName={viewerFile.fileName}
          extension={viewerFile.extension}
          onClose={() => setViewerFile(null)}
        />
      )}

      <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-auto ${
            isMe ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
          }`}
        >
          {isMe ? myInitial : theirInitial}
        </div>

        {/* Bubble + meta */}
        <div className={`flex flex-col gap-0.5 max-w-xs sm:max-w-sm ${isMe ? "items-end" : "items-start"}`}>
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isMe
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-card border border-border text-foreground rounded-tl-sm"
            }`}
          >
            {msg.message_type === "file" && msg.file ? (
              <div className="flex flex-col gap-1.5">
                {canPreview(msg.file.extension) ? (
                  <button
                    onClick={() => setViewerFile({
                      url: msg.file!.url,
                      fileName: msg.file!.file_name,
                      extension: msg.file!.extension,
                    })}
                    className="flex items-center gap-2 underline decoration-primary/50 hover:opacity-80 transition-opacity text-left"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    {msg.file.file_name}
                  </button>
                ) : (
                  <a
                    href={msg.file.url}
                    download={msg.file.file_name}
                    className="flex items-center gap-2 underline decoration-primary/50 hover:opacity-80 transition-opacity"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    {msg.file.file_name}
                  </a>
                )}
                {msg.content && msg.content !== "Sent a file" && (
                  <span className="text-sm mt-1">{msg.content}</span>
                )}
              </div>
            ) : (
              msg.content
            )}
          </div>
          <div className="flex items-center gap-1 px-1">
            <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
            {isMe && (
              showRead
                ? <CheckCheck className="w-3 h-3 text-primary" />
                : <Check className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex gap-2 items-end">
      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0 text-muted-foreground">
        {name[0]}
      </div>
      <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-card border border-border">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Conversation list item ───────────────────────────────────────────────────

interface ConvItemProps {
  conv: Conversation;
  isSelected: boolean;
  currentUserId: number;
  onClick: () => void;
  onDelete: () => void;
}

function ConversationItem({ conv, isSelected, currentUserId, onClick, onDelete }: ConvItemProps) {
  const otherName = conv.user_id === currentUserId ? conv.lawyer_name : conv.user_name;
  const lastMsg = conv.last_message;

  return (
    <div
      className={`group relative flex items-center border-b border-border/50 transition-colors ${
        isSelected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-secondary/50 border-l-2 border-l-transparent"
      }`}
    >
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-3 p-4 text-left"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
            {getInitials(otherName || "?")}
          </div>
          {conv.unread_count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {conv.unread_count > 9 ? "9+" : conv.unread_count}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">{otherName}</p>
            {lastMsg && (
              <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(lastMsg.created_at)}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {lastMsg
              ? lastMsg.message_type === "file"
                ? "Sent a file"
                : lastMsg.content
              : "No messages yet"}
          </p>
        </div>
      </button>

      {/* Delete button — visible on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 mr-2 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
        title="Delete conversation"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

interface ChatPanelProps {
  conv: Conversation;
  currentUserId: number;
}

function ChatPanel({ conv, currentUserId }: ChatPanelProps) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSendingViaWs = useRef(false);
  const [attachedFile, setAttachedFile] = useState<{ id: number, name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const otherName = conv.user_id === currentUserId ? conv.lawyer_name : conv.user_name;
  const myInitial = conv.user_id === currentUserId
    ? getInitials(conv.user_name)
    : getInitials(conv.lawyer_name);
  const theirInitial = getInitials(otherName);

  // Load historical messages from REST
  const { data: pageData, isLoading } = useGetMessages(conv.uuid);
  const sendMsg = useSendMessage(conv.uuid);
  const markRead = useMarkMessagesRead(conv.uuid);

  useEffect(() => {
    if (pageData?.results) {
      setMessages(pageData.results);
    }
  }, [pageData]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers.size]);

  // Mark as read on open
  useEffect(() => {
    if (conv.uuid) markRead.mutate();
  }, [conv.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket handlers
  const handleWsMessage = useCallback((msg: Omit<ChatMessage, "sender_email">) => {
    setMessages((prev) => {
      if (prev.some((m) => m.uuid === msg.uuid)) return prev;
      const full: ChatMessage = { ...msg, sender_email: "" };
      return [...prev, full];
    });
    // Mark read if from other party
    if (msg.sender_id !== currentUserId) {
      markRead.mutate();
    }
    qc.invalidateQueries({ queryKey: chatKeys.conversations() });
  }, [currentUserId, markRead, qc]);

  const handleWsTyping = useCallback((senderId: string, isTyping: boolean) => {
    if (parseInt(senderId, 10) === currentUserId) return;
    setTypingUsers((prev) => {
      const next = new Set(prev);
      if (isTyping) {
        next.add(senderId);
        // Auto-clear after 4 s if no update
        if (typingTimers.current[senderId]) clearTimeout(typingTimers.current[senderId]);
        typingTimers.current[senderId] = setTimeout(() => {
          setTypingUsers((p) => { const s = new Set(p); s.delete(senderId); return s; });
        }, 4000);
      } else {
        next.delete(senderId);
        if (typingTimers.current[senderId]) clearTimeout(typingTimers.current[senderId]);
      }
      return next;
    });
  }, [currentUserId]);

  const handleWsRead = useCallback((_readerId: string) => {
    setMessages((prev) => prev.map((m) => (m.sender_id === currentUserId ? { ...m, is_read: true } : m)));
  }, [currentUserId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', e.target.files[0]);
      
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/api/assistant/files/upload/`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
         const data = await res.json();
         if (data.files && data.files.length > 0) {
             setAttachedFile({ id: data.files[0].id, name: data.files[0].name });
         }
      }
    } catch(err) {
      console.error('File upload failed', err);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReconnect = useCallback(() => {
    qc.invalidateQueries({ queryKey: chatKeys.messages(conv.uuid) });
  }, [conv.uuid, qc]);

  const { sendMessage: wsSend, sendTyping, isConnected } = useConversationSocket({
    conversationUuid: conv.uuid,
    token,
    onMessage: handleWsMessage,
    onTyping: handleWsTyping,
    onRead: handleWsRead,
    onReconnect: handleReconnect,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    sendTyping(true);
    if (typingDebounce.current) clearTimeout(typingDebounce.current);
    typingDebounce.current = setTimeout(() => sendTyping(false), 1500);
  };

  const handleSend = async () => {
    const content = input.trim();
    if ((!content && !attachedFile) || sending || isUploading) return;
    setInput("");
    const fileId = attachedFile?.id;
    setAttachedFile(null);
    setSending(true);
    if (typingDebounce.current) clearTimeout(typingDebounce.current);
    sendTyping(false);

    // Try WebSocket first; fall back to REST
    isSendingViaWs.current = false;
    if (!fileId) {
      isSendingViaWs.current = wsSend(content);
    }
    
    if (!isSendingViaWs.current) {
      try {
        const saved = await sendMsg.mutateAsync({ content: content || "Sent a file", file_id: fileId });
        setMessages((prev) => {
          if (prev.some((m) => m.uuid === saved.uuid)) return prev;
          return [...prev, saved];
        });
      } catch {}
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const grouped: Array<{ date: string; messages: ChatMessage[] }> = [];
  for (const msg of messages) {
    const label = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === label) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: label, messages: [msg] });
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          {theirInitial}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{otherName}</p>
          <div className="flex items-center gap-1.5">
            <Circle className={`w-2 h-2 ${isConnected ? "fill-green-400 text-green-400" : "fill-yellow-400 text-yellow-400"}`} />
            <span className="text-xs text-muted-foreground">
              {!isConnected ? "Reconnecting…" : typingUsers.size > 0 ? "typing…" : "Online"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.date} className="space-y-3">
            <DateSeparator label={group.date} />
            {group.messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              // Show read checkmark only on the last message sent by me
              const isLastMine =
                isMe &&
                messages
                  .filter((m) => m.sender_id === currentUserId)
                  .at(-1)?.uuid === msg.uuid;
              return (
                <MessageBubble
                  key={msg.uuid}
                  msg={msg}
                  isMe={isMe}
                  showRead={isLastMine && msg.is_read}
                  myInitial={myInitial}
                  theirInitial={theirInitial}
                />
              );
            })}
          </div>
        ))}
        {typingUsers.size > 0 && <TypingIndicator name={otherName} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border shrink-0 bg-background/50 backdrop-blur-sm">
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-[10px] font-bold text-muted-foreground">
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <button 
                onClick={() => setAttachedFile(null)}
                className="ml-1 hover:text-destructive shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            disabled={sending || isUploading}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none max-h-32 overflow-y-auto shadow-sm"
            style={{ minHeight: "2.625rem" }}
          />
          <input 
             type="file" 
             className="hidden" 
             ref={fileInputRef} 
             onChange={handleFileChange} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || isUploading}
            className="p-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all disabled:opacity-50 flex items-center justify-center shrink-0 border border-transparent hover:border-border"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachedFile) || sending || isUploading}
            className="px-4 py-2.5 rounded-xl gold-gradient text-primary-foreground hover:opacity-90 disabled:opacity-40 flex items-center justify-center shrink-0 shadow-md"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1 flex items-center justify-between">
          <span>Press Enter to send · Shift+Enter for newline</span>
          <span className="text-primary/70 font-semibold">End-to-End Encrypted</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = useGetConversations();
  const deleteConv = useDeleteConversation();

  const { data: searchedUsers, isLoading: searchingUsers } = useGetAvailableLawyers(
    search ? { search } : undefined
  );
  const createConv = useCreateConversation();

  const handleDelete = (uuid: string) => {
    deleteConv.mutate(uuid, {
      onSuccess: () => {
        if (selectedUuid === uuid) setSelectedUuid(null);
      },
    });
  };

  const filtered = (conversations ?? []).filter((c) => {
    if (!search) return true;
    const other = c.user_id === user?.id ? c.lawyer_name : c.user_name;
    return other.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = filtered.find((c) => c.uuid === selectedUuid) ?? null;

  const totalUnread = (conversations ?? []).reduce((n, c) => n + c.unread_count, 0);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col border-r border-border bg-card/30 shrink-0 w-72 ${
          selectedConv ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Messages</h2>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {totalUnread}
              </span>
            )}
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users & conversations…"
              className="flex-1 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && filtered.length === 0 && search.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a chat from a lawyer's profile or search above
              </p>
            </div>
          )}
          
          {filtered.length > 0 && (
            <div className="py-2">
              <h3 className="px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Conversations</h3>
              {filtered.map((conv) => (
                <ConversationItem
                  key={conv.uuid}
                  conv={conv}
                  isSelected={conv.uuid === selectedUuid}
                  currentUserId={user?.id ?? 0}
                  onClick={() => setSelectedUuid(conv.uuid)}
                  onDelete={() => handleDelete(conv.uuid)}
                />
              ))}
            </div>
          )}

          {/* Other Users */}
          <div className="py-2 border-t border-border/50">
            <h3 className="px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Other Users</h3>
            {searchingUsers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : searchedUsers && searchedUsers.length > 0 ? (
              searchedUsers
                .filter(l => !(conversations ?? []).some(c => c.lawyer_id === l.id && c.user_id === user?.id))
                .map((lawyer) => (
                  <button
                    key={`user-${lawyer.id}`}
                    onClick={async () => {
                      try {
                        const newConv = await createConv.mutateAsync(lawyer.id);
                        setSelectedUuid(newConv.uuid);
                        setSearch("");
                      } catch (err) {}
                    }}
                    className="w-full flex items-center gap-3 p-4 border-b border-border/50 transition-colors text-left hover:bg-secondary/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {getInitials(`${lawyer.firstName} ${lawyer.lastName}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lawyer.firstName} {lawyer.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{lawyer.specialization || "Lawyer"}</p>
                    </div>
                  </button>
                ))
            ) : (
              <p className="px-4 py-2 text-xs text-muted-foreground">No matching users found.</p>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${!selectedConv ? "hidden md:flex" : "flex"}`}>
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-foreground font-semibold">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose from the sidebar or start one from a lawyer's profile
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile back button */}
            <div className="md:hidden px-4 py-2 border-b border-border">
              <button
                onClick={() => setSelectedUuid(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to conversations
              </button>
            </div>
            <ChatPanel conv={selectedConv} currentUserId={user?.id ?? 0} />
          </>
        )}
      </div>
    </div>
  );
}
