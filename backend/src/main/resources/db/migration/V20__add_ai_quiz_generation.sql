-- Paid AI Quiz Generator for instructors.
-- Stores the paid AI generation job, its server-computed price, payment
-- reference (PayPal order), and the generated draft until the instructor
-- reviews and saves it as a normal Quiz via the existing QuizService.
CREATE TABLE IF NOT EXISTS ai_quiz_generation (
    id UUID PRIMARY KEY,

    -- Owner = the instructor who paid for the generation.
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Course (required) + optional lesson the quiz covers.
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    question_count INT NOT NULL,
    difficulty VARCHAR(16) NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    language VARCHAR(16) NOT NULL,
    passing_score INT NOT NULL,
    max_attempts INT NOT NULL,

    -- Server-computed price (never trusted from the client).
    price NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL,

    status VARCHAR(20) NOT NULL,

    -- Reference to the PayPal order paid for this generation.
    paypal_order_id VARCHAR(64),

    -- Set once the instructor saves the reviewed draft as a real quiz.
    saved_quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,

    -- JSON draft produced by the AI provider (serialized string, validated before persist).
    generated_result TEXT,

    error_message TEXT,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_quiz_generation_user ON ai_quiz_generation(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_quiz_generation_course ON ai_quiz_generation(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_quiz_generation_status ON ai_quiz_generation(status);