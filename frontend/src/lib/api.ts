import axios, { AxiosError, AxiosInstance } from 'axios';
import { storage } from '@/utils/storage';
import type {
  AdminStats,
  ApiSuccess,
  Article,
  ArticleListItem,
  AssignmentAdmin,
  AssignmentPublic,
  CreateSubmissionResult,
  DashboardData,
  LeaderboardEntry,
  PageResult,
  RankInfo,
  Submission,
  User,
} from '@/types/api';

const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: () => void = () => {
  storage.clear();
  if (typeof window !== 'undefined') window.location.href = '/login';
};

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export interface ApiErrorShape {
  message: string;
  status: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

export function extractError(err: unknown): ApiErrorShape {
  const axiosErr = err as AxiosError<{
    error?: {
      message?: string;
      status?: number;
      code?: string;
      details?: { fieldErrors?: Record<string, string[]> };
    };
  }>;
  const data = axiosErr?.response?.data?.error;
  return {
    message: data?.message || axiosErr?.message || 'Something went wrong',
    status: data?.status ?? axiosErr?.response?.status ?? 0,
    code: data?.code,
    fieldErrors: data?.details?.fieldErrors,
  };
}

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export const api = {
  auth: {
    signup: (input: { name: string; email: string; password: string }) =>
      unwrap<{ user: User; token: string }>(apiClient.post('/auth/signup', input)),
    login: (input: { email: string; password: string }) =>
      unwrap<{ user: User; token: string }>(apiClient.post('/auth/login', input)),
    me: () => unwrap<User>(apiClient.get('/auth/me')),
    logout: () => apiClient.post('/auth/logout'),
  },

  articles: {
    list: (params?: { tag?: string; q?: string; page?: number; limit?: number; sort?: 'recent' | 'popular' }) =>
      unwrap<PageResult<ArticleListItem>>(apiClient.get('/articles', { params })),
    tags: () => unwrap<Array<{ tag: string; count: number }>>(apiClient.get('/articles/tags')),
    getBySlug: (slug: string) => unwrap<Article>(apiClient.get(`/articles/${encodeURIComponent(slug)}`)),
    create: (input: {
      title: string;
      content: string;
      summary?: string;
      tags: string[];
      coverImageUrl?: string | null;
      published?: boolean;
    }) => unwrap<Article>(apiClient.post('/articles', input)),
    update: (id: string, input: Partial<Parameters<typeof api.articles.create>[0]>) =>
      unwrap<Article>(apiClient.patch(`/articles/${id}`, input)),
    remove: (id: string) => apiClient.delete(`/articles/${id}`),
    setProgress: (id: string, percent: number) =>
      unwrap<{ articleId: string; percent: number }>(apiClient.post(`/articles/${id}/progress`, { percent })),
  },

  assignments: {
    getForArticle: (articleId: string) =>
      unwrap<AssignmentPublic | null>(apiClient.get(`/articles/${articleId}/assignment`)),
    upsertForArticle: (
      articleId: string,
      input: { title: string; passingScore?: number; questions: AssignmentAdmin['questions'] | unknown[] },
    ) => unwrap<AssignmentAdmin>(apiClient.post(`/articles/${articleId}/assignment`, input)),
    getAdmin: (id: string) => unwrap<AssignmentAdmin>(apiClient.get(`/assignments/${id}/admin`)),
    update: (id: string, input: { title: string; passingScore?: number; questions: unknown[] }) =>
      unwrap<AssignmentAdmin>(apiClient.patch(`/assignments/${id}`, input)),
    remove: (id: string) => apiClient.delete(`/assignments/${id}`),
  },

  submissions: {
    create: (input: {
      articleId: string;
      durationMs?: number;
      answers: Array<{ questionId: string; type: 'MCQ' | 'SHORT'; mcqIndex?: number; text?: string }>;
    }) => unwrap<CreateSubmissionResult>(apiClient.post('/submissions', input)),
    listMine: (params?: { page?: number; limit?: number }) =>
      unwrap<PageResult<Submission>>(apiClient.get('/submissions/me', { params })),
    latestForArticle: (articleId: string) =>
      unwrap<Submission | null>(apiClient.get(`/submissions/me/article/${articleId}`)),
    get: (id: string) => unwrap<Submission>(apiClient.get(`/submissions/${id}`)),
  },

  leaderboard: {
    top: (limit = 20) => unwrap<LeaderboardEntry[]>(apiClient.get('/leaderboard', { params: { limit } })),
    myRank: () => unwrap<RankInfo>(apiClient.get('/leaderboard/me/rank')),
  },

  dashboard: {
    me: () => unwrap<DashboardData>(apiClient.get('/dashboard/me')),
    admin: () => unwrap<AdminStats>(apiClient.get('/dashboard/admin')),
  },

  ai: {
    summarize: (articleId: string, refresh = false) =>
      unwrap<{ summary: string; cached: boolean }>(apiClient.post('/ai/summarize', { articleId, refresh })),
    hint: (input: { articleId: string; questionId: string; draft?: string }) =>
      unwrap<{ hint: string }>(apiClient.post('/ai/hint', input)),
    chat: (messages: Array<{ role: 'user' | 'model'; content: string }>) =>
      unwrap<{ reply: string }>(apiClient.post('/ai/chat', { messages })),
  },
};
