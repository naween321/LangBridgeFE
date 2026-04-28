import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LawyerProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  barNumber: string;
  specialization: string;
  bio: string;
  isAvailable: boolean;
  yearsOfExperience: number;
  languages: string[];
  hourlyRate: string | null;
  rating: number;
  reviewCount: number;
  verificationStatus: string;
}

export interface LastMessage {
  content: string;
  message_type: string;
  created_at: string;
  sender_id: number;
}

export interface Conversation {
  uuid: string;
  user_id: number;
  user_email: string;
  user_name: string;
  lawyer_id: number;
  lawyer_email: string;
  lawyer_name: string;
  is_active: boolean;
  last_message: LastMessage | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  uuid: string;
  sender_id: number;
  sender_email: string;
  content: string;
  message_type: "text" | "file";
  file: { id: number; file_name: string; extension: string; url: string } | null;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedMessages {
  count: number;
  next: string | null;
  previous: string | null;
  results: ChatMessage[];
}

// ─── Keys ────────────────────────────────────────────────────────────────────

export const chatKeys = {
  lawyers: (params?: object) => ["chat", "lawyers", params] as const,
  lawyer: (userId: number) => ["chat", "lawyer", userId] as const,
  conversations: () => ["chat", "conversations"] as const,
  conversation: (uuid: string) => ["chat", "conversation", uuid] as const,
  messages: (uuid: string) => ["chat", "messages", uuid] as const,
};

// ─── Lawyers ─────────────────────────────────────────────────────────────────

export function useGetAvailableLawyers(params?: { search?: string; specialization?: string }) {
  const { token } = useAuth();
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.specialization) query.set("specialization", params.specialization);
  const qs = query.toString();

  return useQuery({
    queryKey: chatKeys.lawyers(params),
    queryFn: () => apiFetch(`/chat/lawyers${qs ? `?${qs}` : ""}`, token) as Promise<LawyerProfile[]>,
    enabled: !!token,
  });
}

export function useGetLawyerDetail(userId: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: chatKeys.lawyer(userId),
    queryFn: () => apiFetch(`/chat/lawyers/${userId}`, token) as Promise<LawyerProfile>,
    enabled: !!token && !!userId,
  });
}

// ─── Conversations ────────────────────────────────────────────────────────────

export function useGetConversations() {
  const { token } = useAuth();
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: () => apiFetch("/chat/conversations", token) as Promise<Conversation[]>,
    enabled: !!token,
    refetchInterval: 15000,
  });
}

export function useCreateConversation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lawyerId: number) =>
      apiFetch("/chat/conversations/create", token, {
        method: "POST",
        body: JSON.stringify({ lawyer_id: lawyerId }),
      }) as Promise<Conversation>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function useGetMessages(conversationUuid: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: chatKeys.messages(conversationUuid),
    queryFn: () =>
      apiFetch(`/chat/conversations/${conversationUuid}/messages`, token) as Promise<PaginatedMessages>,
    enabled: !!token && !!conversationUuid,
  });
}

export function useSendMessage(conversationUuid: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; file_id?: number }) =>
      apiFetch(`/chat/conversations/${conversationUuid}/messages/send`, token, {
        method: "POST",
        body: JSON.stringify({ 
          content: data.content, 
          message_type: data.file_id ? "file" : "text",
          file_id: data.file_id
        }),
      }) as Promise<ChatMessage>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(conversationUuid) });
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useMarkMessagesRead(conversationUuid: string) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/chat/conversations/${conversationUuid}/messages/read`, token, {
        method: "PATCH",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useDeleteConversation() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch(`/chat/conversations/${uuid}`, token, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}
