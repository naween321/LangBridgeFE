import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useGetConversations, useGetConversation, useSendDirectMessage,
  getGetConversationQueryKey, getGetConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Loader2, ArrowLeft } from "lucide-react";

export default function MessagesPage() {
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const { data: conversations, isLoading: convsLoading } = useGetConversations({ query: { enabled: !!token } });
  const { data: convDetail, isLoading: detailLoading } = useGetConversation(selectedConv!, { query: { enabled: !!selectedConv } });
  const sendMsg = useSendDirectMessage();

  const handleSend = async () => {
    if (!input.trim() || !selectedConv || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendMsg.mutateAsync({ conversationId: selectedConv, data: { content } });
      qc.invalidateQueries({ queryKey: getGetConversationQueryKey(selectedConv) });
      qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-full">
      {/* Conversation List */}
      <div className="w-72 flex flex-col border-r border-border bg-card/30 shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Messages</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Direct messages with lawyers</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convsLoading && (
            <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          )}
          {!convsLoading && (!conversations || conversations.length === 0) && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a chat from a lawyer's profile</p>
            </div>
          )}
          {conversations?.map((conv: any) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConv(conv.id)}
              className={`flex items-center gap-3 p-4 cursor-pointer border-b border-border/50 transition-colors ${
                selectedConv === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-secondary/50"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {conv.lawyerName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{conv.lawyerName}</p>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || "No messages"}</p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {conv.unreadCount}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">Choose a conversation from the sidebar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="md:hidden text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                {convDetail?.lawyerName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{convDetail?.lawyerName}</p>
                <p className="text-xs text-muted-foreground">Attorney</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detailLoading && (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              )}
              {!detailLoading && (!convDetail?.messages || convDetail.messages.length === 0) && (
                <div className="text-center py-8 text-sm text-muted-foreground">No messages yet. Send the first one!</div>
              )}
              {convDetail?.messages?.map((msg: any) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "flex-row-reverse" : ""} gap-2`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      {isMe ? (user?.firstName?.[0] || "U") : convDetail.lawyerName?.[0]}
                    </div>
                    <div className={`max-w-sm px-3.5 py-2.5 rounded-xl text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Type a message..." disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleSend} disabled={!input.trim() || sending}
                  className="px-4 py-2.5 rounded-xl gold-gradient text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
