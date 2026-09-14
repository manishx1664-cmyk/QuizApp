export type UserRole = 'admin' | 'learner';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  questionCount?: number;
  quizCount?: number;
  createdAt: string;
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizStatus = 'draft' | 'published' | 'archived';
export type ReviewMode = 'immediate' | 'delayed' | 'score_only' | 'full_review';

export interface QuizSettings {
  timeLimitMinutes: number; // 0 for untimed
  passingPercentage: number;
  attemptsAllowed: number; // 0 for unlimited
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  allowReview: boolean;
  allowRetake: boolean;
  reviewMode: ReviewMode;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  categoryId?: string;
  categoryName?: string;
  difficulty: QuizDifficulty;
  status: QuizStatus;
  settings: QuizSettings;
  questionCount: number;
  attemptCount: number;
  joinCode?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Option {
  id: string;
  questionId: string;
  optionLetter: string; // 'A', 'B', 'C', 'D'
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export type AnswerDetectionMethod =
  | 'answer_key'
  | 'marked_checkmark'
  | 'marked_circle'
  | 'marked_bold'
  | 'marked_underline'
  | 'explicit_label'
  | 'ai_inferred'
  | 'manual_required';

export interface Question {
  id: string;
  quizId?: string;
  quizTitle?: string;
  questionText: string;
  imageUrl?: string;
  options: Option[];
  correctOptionId?: string;
  detectedAnswerLetter?: string;
  detectionMethod: AnswerDetectionMethod;
  confidence: number;
  requiresReview: boolean;
  duplicateWarning?: boolean;
  explanation?: string;
  difficulty: QuizDifficulty;
  categoryId?: string;
  categoryName?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionVersion {
  id: string;
  questionId: string;
  questionText: string;
  imageUrl?: string;
  explanation?: string;
  optionsJson: Option[];
  changedBy: string;
  changedByName?: string;
  changedAt: string;
}

export interface ExtractedOption {
  letter: string;
  text: string;
}

export interface ExtractedQuestion {
  tempId: string;
  questionNumber: number;
  questionText: string;
  imageUrl?: string;
  options: ExtractedOption[];
  detectedAnswerLetter?: string;
  detectionMethod: AnswerDetectionMethod;
  confidence: number;
  requiresReview: boolean;
  explanation?: string;
  duplicateWarning?: boolean;
  difficulty?: QuizDifficulty;
  category?: string;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'requires_review' | 'failed';

export interface PdfProcessingJob {
  id: string;
  filename: string;
  filesize: number;
  status: JobStatus;
  progress: number;
  questionsFound: number;
  answersDetected: number;
  requiresReviewCount: number;
  duplicatesCount: number;
  errorMessage?: string;
  questions: ExtractedQuestion[];
  createdAt: string;
  completedAt?: string;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'abandoned';

export interface AttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId?: string;
  isCorrect?: boolean;
  isMarkedForReview: boolean;
  answeredAt?: string;
}

export interface Attempt {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  learnerName?: string;
  quizId: string;
  quizTitle: string;
  startedAt: string;
  submittedAt?: string;
  deadlineAt?: string;
  timeTakenSeconds?: number;
  score?: number;
  maxScore: number;
  percentage?: number;
  isPassed?: boolean;
  status: AttemptStatus;
}

export interface JoinQuizRequest {
  joinCode: string;
  learnerName: string;
}

// Learner-facing Question during active attempt (correct answer is completely hidden)
export interface LearnerQuestionView {
  id: string;
  questionText: string;
  imageUrl?: string;
  options: {
    id: string;
    optionLetter: string;
    text: string;
  }[];
  selectedOptionId?: string;
  isMarkedForReview: boolean;
}

export interface ActiveQuizAttemptSession {
  attempt: Attempt;
  quiz: {
    id: string;
    title: string;
    description: string;
    timeLimitMinutes: number;
    questionCount: number;
    allowReview: boolean;
  };
  questions: LearnerQuestionView[];
  remainingSeconds: number;
}

export interface QuizResultItem {
  questionId: string;
  questionText: string;
  imageUrl?: string;
  options: {
    id: string;
    optionLetter: string;
    text: string;
  }[];
  selectedOptionId?: string;
  correctOptionId?: string;
  selectedLetter?: string;
  correctLetter?: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizResultResponse {
  attempt: Attempt;
  quiz: Quiz;
  reviewAllowed: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  results?: QuizResultItem[];
  stats: {
    totalQuestions: number;
    attempted: number;
    unattempted: number;
    correct: number;
    incorrect: number;
    score: number;
    percentage: number;
    isPassed: boolean;
    timeTakenSeconds: number;
  };
}

export interface AnalyticsSummary {
  totalQuizzes: number;
  publishedQuizzes: number;
  draftQuizzes: number;
  totalLearners: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  scoreDistribution: {
    range: string;
    count: number;
  }[];
  recentAttempts: Attempt[];
  difficultQuestions: {
    questionId: string;
    questionText: string;
    quizTitle: string;
    attempts: number;
    correctRate: number;
    incorrectRate: number;
  }[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
