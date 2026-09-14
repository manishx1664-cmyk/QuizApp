export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'learner')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    time_limit_minutes INTEGER DEFAULT 0,
    passing_percentage INTEGER DEFAULT 60,
    attempts_allowed INTEGER DEFAULT 0,
    randomize_questions BOOLEAN DEFAULT false,
    randomize_options BOOLEAN DEFAULT false,
    show_results_immediately BOOLEAN DEFAULT true,
    show_correct_answers BOOLEAN DEFAULT true,
    show_explanations BOOLEAN DEFAULT true,
    allow_review BOOLEAN DEFAULT true,
    allow_retake BOOLEAN DEFAULT true,
    review_mode TEXT DEFAULT 'full_review' CHECK (review_mode IN ('immediate', 'delayed', 'score_only', 'full_review')),
    join_code TEXT UNIQUE,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    image_url TEXT,
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    correct_option_id TEXT,
    detected_answer_letter TEXT,
    detection_method TEXT DEFAULT 'manual_required',
    confidence NUMERIC(4,2) DEFAULT 0.0,
    requires_review BOOLEAN DEFAULT false,
    duplicate_warning BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_letter TEXT NOT NULL,
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS question_versions (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    image_url TEXT,
    explanation TEXT,
    options_json JSONB NOT NULL,
    changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    learner_name TEXT DEFAULT 'Learner',
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    time_taken_seconds INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    percentage NUMERIC(5,2) DEFAULT 0.0,
    is_passed BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'abandoned'))
);

CREATE TABLE IF NOT EXISTS attempt_answers (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id TEXT REFERENCES question_options(id) ON DELETE SET NULL,
    is_correct BOOLEAN DEFAULT false,
    is_marked_for_review BOOLEAN DEFAULT false,
    answered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    user_email TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pdf_jobs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'requires_review', 'failed')),
    progress INTEGER DEFAULT 0,
    questions_found INTEGER DEFAULT 0,
    answers_detected INTEGER DEFAULT 0,
    requires_review_count INTEGER DEFAULT 0,
    duplicates_count INTEGER DEFAULT 0,
    error_message TEXT,
    questions_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_join_code ON quizzes(join_code);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_options_question ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
`;
