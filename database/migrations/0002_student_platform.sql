-- Tabelas da plataforma de estudo definidas em lib/db/schema.ts.

CREATE TABLE IF NOT EXISTS "study_quizzes" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "questions" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "quiz_id" text NOT NULL,
  "score" integer NOT NULL,
  "total" integer NOT NULL,
  "answers" jsonb NOT NULL,
  "completed_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'system',
  "read_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "follows" (
  "follower_id" text NOT NULL,
  "following_id" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "post_likes" (
  "post_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "institutions" (
  "id" text PRIMARY KEY,
  "short_name" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "logo_url" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "student_profiles" (
  "user_id" text PRIMARY KEY,
  "phone" text,
  "nickname" text,
  "institution_id" text,
  "target_course" text,
  "target_score" integer NOT NULL DEFAULT 12,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
