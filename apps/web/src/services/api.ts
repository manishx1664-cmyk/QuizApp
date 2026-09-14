import {
  AuthResponse,
  User,
  Quiz,
  Question,
  QuestionVersion,
  ActiveQuizAttemptSession,
  QuizResultResponse,
  Attempt,
  AnalyticsSummary,
  Category,
  AuditLog,
  PdfProcessingJob,
  ExtractedQuestion,
  QuizDifficulty,
  QuizStatus,
  QuizSettings
} from '@quizforge/shared';

const API_BASE = (((import.meta as any).env?.VITE_API_BASE_URL as string) || '').replace(/\/+$/, '') + '/api';




function getHeaders(isFormData = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('quizforge_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const config: RequestInit = {
    ...options,
    headers: {
      ...getHeaders(isFormData),
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.warning || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  register: (name: string, email: string, password: string, role: 'admin' | 'learner') =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  // Categories
  getCategories: () => request<{ categories: Category[] }>('/categories'),
  createCategory: (name: string, description?: string) =>
    request<{ category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    }),
  deleteCategory: (id: string) =>
    request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' }),

  // Quizzes
  getQuizzes: (params: { status?: QuizStatus; categoryId?: string; difficulty?: QuizDifficulty; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.difficulty) query.append('difficulty', params.difficulty);
    if (params.search) query.append('search', params.search);
    return request<{ quizzes: Quiz[] }>(`/quizzes?${query.toString()}`);
  },

  getQuizById: (id: string) => request<{ quiz: Quiz; questions: Question[] }>(`/quizzes/${id}`),

  createQuiz: (data: {
    title: string;
    description?: string;
    categoryId?: string;
    difficulty?: QuizDifficulty;
    settings?: Partial<QuizSettings>;
  }) =>
    request<{ quiz: Quiz }>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  createQuizFromExtraction: (data: {
    title: string;
    description?: string;
    categoryId?: string;
    difficulty?: QuizDifficulty;
    settings?: Partial<QuizSettings>;
    questions: ExtractedQuestion[];
  }) =>
    request<{ quiz: Quiz; questions: Question[] }>('/quizzes/from-extraction', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateQuiz: (id: string, data: Partial<Quiz>) =>
    request<{ quiz: Quiz }>(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  publishQuiz: (id: string, force = false) =>
    request<{ quiz: Quiz; warning?: string }>(`/quizzes/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ force })
    }),

  duplicateQuiz: (id: string) =>
    request<{ quiz: Quiz }>(`/quizzes/${id}/duplicate`, { method: 'POST' }),

  deleteQuiz: (id: string) =>
    request<{ success: boolean }>(`/quizzes/${id}`, { method: 'DELETE' }),

  exportQuizUrl: (id: string, format: 'json' | 'csv') =>
    `/api/quizzes/${id}/export?format=${format}`,

  // PDF Processing
  uploadPdf: (file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return request<{ message: string; job: PdfProcessingJob }>('/pdf/upload', {
      method: 'POST',
      body: formData
    });
  },

  getPdfJob: (jobId: string) => request<{ job: PdfProcessingJob }>(`/pdf/jobs/${jobId}`),

  updatePdfJobQuestions: (jobId: string, questions: ExtractedQuestion[]) =>
    request<{ job: PdfProcessingJob }>(`/pdf/jobs/${jobId}/questions`, {
      method: 'PUT',
      body: JSON.stringify({ questions })
    }),

  // Image Uploads (Clipboard paste & file selection)
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ url: string; filename: string }>('/upload/image', {
      method: 'POST',
      body: formData
    });
  },

  uploadImageBase64: (base64: string) =>
    request<{ url: string; filename: string }>('/upload/image-base64', {
      method: 'POST',
      body: JSON.stringify({ base64 })
    }),

  // Question Bank
  getQuestions: (params: {
    search?: string;
    categoryId?: string;
    difficulty?: QuizDifficulty;
    quizId?: string;
    requiresReview?: boolean;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.difficulty) query.append('difficulty', params.difficulty);
    if (params.quizId) query.append('quizId', params.quizId);
    if (params.requiresReview !== undefined) query.append('requiresReview', String(params.requiresReview));
    return request<{ questions: Question[] }>(`/questions?${query.toString()}`);
  },

  getQuestionById: (id: string) => request<{ question: Question }>(`/questions/${id}`),

  getQuestionVersions: (id: string) => request<{ versions: QuestionVersion[] }>(`/questions/${id}/versions`),

  createQuestion: (data: {
    quizId?: string;
    questionText: string;
    imageUrl?: string;
    explanation?: string;
    difficulty?: QuizDifficulty;
    categoryId?: string;
    options: { letter: string; text: string; isCorrect: boolean }[];
    requiresReview?: boolean;
  }) =>
    request<{ question: Question }>('/questions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateQuestion: (
    id: string,
    data: {
      questionText?: string;
      imageUrl?: string;
      explanation?: string;
      difficulty?: QuizDifficulty;
      categoryId?: string;
      options?: { id?: string; letter: string; text: string; isCorrect: boolean }[];
      correctOptionId?: string;
      requiresReview?: boolean;
    }
  ) =>
    request<{ question: Question }>(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  duplicateQuestion: (id: string) =>
    request<{ question: Question }>(`/questions/${id}/duplicate`, { method: 'POST' }),

  deleteQuestion: (id: string) =>
    request<{ success: boolean }>(`/questions/${id}`, { method: 'DELETE' }),

  // Quiz Engine & Attempts
  getQuizByJoinCode: (joinCode: string) =>
    request<{ quiz: Quiz; questionCount: number }>(`/quizzes/join/${joinCode}`),

  joinQuizByCode: (joinCode: string, learnerName: string) =>
    request<ActiveQuizAttemptSession>('/attempts/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode, learnerName })
    }),

  startQuizAttempt: (quizId: string) =>
    request<ActiveQuizAttemptSession>(`/quizzes/${quizId}/start`, { method: 'POST' }),

  recordAnswer: (attemptId: string, questionId: string, selectedOptionId: string | null, isMarkedForReview = false) =>
    request<{ saved: boolean; autoSubmitted?: boolean }>(`/attempts/${attemptId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, selectedOptionId, isMarkedForReview })
    }),

  submitQuizAttempt: (attemptId: string, isAuto = false) =>
    request<QuizResultResponse>(`/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ isAuto })
    }),

  getAttemptResult: (attemptId: string) =>
    request<QuizResultResponse>(`/attempts/${attemptId}`),

  getMyAttempts: () =>
    request<{ attempts: Attempt[] }>('/attempts/my-attempts'),

  // Analytics & Audit
  getAnalyticsSummary: () => request<AnalyticsSummary>('/analytics'),
  getAuditLogs: (limit = 100) => request<{ logs: AuditLog[] }>(`/audit-logs?limit=${limit}`)
};

