export type Role = 'USER' | 'ADMIN';
export type QuestionType = 'MCQ' | 'SHORT';
export type SubmissionStatus = 'GRADED' | 'PENDING';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  gamification: {
    badges: string[];
    streak: number;
    lastActivityAt: string | null;
    totalPoints: number;
  };
  readingProgress: Array<{ articleId: string; percent: number }>;
  stats: {
    assignmentsAttempted: number;
    assignmentsPassed: number;
    avgScore: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  tags: string[];
  coverImageUrl: string | null;
  viewCount: number;
  estimatedReadTime: number;
  createdAt: string;
  author: { id: string; name: string };
}

export interface Article extends ArticleListItem {
  content: string;
  published: boolean;
  authorId: string;
  updatedAt: string;
  readingProgress?: number;
}

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  order: number;
}

export interface McqQuestionPublic extends BaseQuestion {
  type: 'MCQ';
  options: string[];
}

export interface ShortQuestionPublic extends BaseQuestion {
  type: 'SHORT';
  maxWords?: number;
}

export type QuestionPublic = McqQuestionPublic | ShortQuestionPublic;

export interface AssignmentPublic {
  id: string;
  articleId: string;
  title: string;
  passingScore: number;
  questions: QuestionPublic[];
  article?: { id: string; title: string; slug: string };
}

export interface AdminQuestion extends BaseQuestion {
  options: string[];
  correctIndex: number | null;
  modelAnswer: string | null;
  rubric: string | null;
  maxWords: number | null;
}

export interface AssignmentAdmin {
  id: string;
  articleId: string;
  title: string;
  passingScore: number;
  questions: AdminQuestion[];
  article?: { id: string; title: string; slug: string };
}

export interface AnswerInput {
  questionId: string;
  type: QuestionType;
  mcqIndex?: number;
  text?: string;
}

export interface AnswerResult {
  questionId: string;
  type: QuestionType;
  mcqIndex: number | null;
  text: string | null;
  score: number;
  pointsAwarded: number;
  feedback: string | null;
  isCorrect: boolean | null;
}

export interface Submission {
  id: string;
  userId: string;
  articleId: string;
  assignmentId: string;
  answers: AnswerResult[];
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  status: SubmissionStatus;
  aiUsed: boolean;
  durationMs: number | null;
  createdAt: string;
  article?: { id: string; title: string; slug: string; tags?: string[] };
}

export interface CreateSubmissionResult {
  submission: Submission;
  meta: { newBadges: string[]; rank?: number };
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  badges: string[];
  avgScore: number;
  completionRate: number;
  compositeScore: number;
  totalSubmissions: number;
}

export interface RankInfo {
  rank: number | null;
  total: number;
  entry: LeaderboardEntry | null;
  neighbors: Array<LeaderboardEntry & { rank: number }>;
}

export interface DashboardData {
  totals: {
    attempted: number;
    avgPercentage: number;
    passed: number;
    distinctArticles: number;
  };
  recentActivity: Submission[];
  scoreOverTime: Array<{ date: string; avgPercentage: number; submissions: number }>;
  tagBreakdown: Array<{ tag: string; avgPercentage: number; submissions: number }>;
  gamification: User['gamification'];
  stats: User['stats'];
}

export interface AdminStats {
  totals: { users: number; articles: number; submissions: number };
  topArticles: Array<{ id: string; title: string; slug: string; submissions: number }>;
  recentUsers: Array<{ id: string; name: string; email: string; role: Role; createdAt: string }>;
  recentSubmissions: Array<
    Submission & { user: { id: string; name: string }; article: { id: string; title: string; slug: string } }
  >;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    status: number;
    message: string;
    code?: string;
    details?: { fieldErrors?: Record<string, string[]> };
    requestId?: string;
  };
}
