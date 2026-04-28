import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LawyerItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string;
  bio: string;
  barNumber: string;
  yearsOfExperience: number;
  languages: string[];
  age: number | null;
  hourlyRate: string | null;
  isAvailable: boolean;
  verificationStatus: "APPROVED" | "PENDING";
  rating: number;
  reviewCount: number;
}

export interface LawyerReview {
  id: number;
  lawyerId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface LawyerStats {
  totalLawyers: number;
  averageRating: number;
}

// ─── Keys ────────────────────────────────────────────────────────────────────

export const lawyerKeys = {
  list: (params?: object) => ["lawyers", "list", params] as const,
  detail: (id: number) => ["lawyers", "detail", id] as const,
  stats: () => ["lawyers", "stats"] as const,
  reviews: (id: number) => ["lawyers", "reviews", id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useGetLawyerList(params?: {
  search?: string;
  specialization?: string;
  language?: string;
  minRating?: number;
}) {
  const { token } = useAuth();
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.specialization) query.set("specialization", params.specialization);
  if (params?.language) query.set("language", params.language);
  if (params?.minRating) query.set("minRating", params.minRating.toString());
  const qs = query.toString();

  return useQuery({
    queryKey: lawyerKeys.list(params),
    queryFn: () => apiFetch(`/chat/lawyers${qs ? `?${qs}` : ""}`, token) as Promise<LawyerItem[]>,
    enabled: !!token,
  });
}

export function useGetLawyerDetail(id: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: lawyerKeys.detail(id),
    queryFn: () => apiFetch(`/chat/lawyers/${id}`, token) as Promise<LawyerItem>,
    enabled: !!token && !!id,
  });
}

export function useGetLawyerStats() {
  const { token } = useAuth();
  return useQuery({
    queryKey: lawyerKeys.stats(),
    queryFn: () => apiFetch("/chat/lawyers/stats", token) as Promise<LawyerStats>,
    enabled: !!token,
  });
}

export function useGetLawyerReviews(lawyerId: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: lawyerKeys.reviews(lawyerId),
    queryFn: () => apiFetch(`/chat/lawyers/${lawyerId}/reviews`, token) as Promise<LawyerReview[]>,
    enabled: !!token && !!lawyerId,
  });
}

export function useAddLawyerReview() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lawyerId, rating, comment }: { lawyerId: number; rating: number; comment: string }) =>
      apiFetch(`/chat/lawyers/${lawyerId}/reviews`, token, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      }) as Promise<LawyerReview>,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: lawyerKeys.reviews(variables.lawyerId) });
      qc.invalidateQueries({ queryKey: lawyerKeys.detail(variables.lawyerId) });
      qc.invalidateQueries({ queryKey: lawyerKeys.list() });
    },
  });
}
