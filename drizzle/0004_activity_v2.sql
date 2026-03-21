-- Activity v2 tables: projects, rules, artifacts, sessions, summaries, post drafts
-- Also: add project_slug and session_id columns to activity_notes

CREATE TABLE "activity_projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"repo_path_pattern" text,
	"repo_remote_pattern" text,
	"domain_pattern" text,
	"branch_pattern" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "activity_projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "activity_rules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"source_type" text NOT NULL,
	"match_kind" text NOT NULL,
	"match_value" text NOT NULL,
	"result_project_slug" text,
	"result_category" text,
	"result_activity_type" text,
	"confidence" integer DEFAULT 80 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "activity_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"project_slug" text,
	"artifact_type" text NOT NULL,
	"source_app" text,
	"title" text,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"privacy_level" text DEFAULT 'private' NOT NULL,
	"fingerprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_artifacts_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "activity_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"duration_sec" integer NOT NULL,
	"project_slug" text,
	"category" text DEFAULT 'unknown' NOT NULL,
	"activity_type" text DEFAULT 'active' NOT NULL,
	"primary_app" text DEFAULT '' NOT NULL,
	"primary_title" text,
	"is_afk" boolean DEFAULT false NOT NULL,
	"keys" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"scroll" integer DEFAULT 0 NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"source_version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "activity_daily_summaries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"date" date NOT NULL,
	"facts_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"short_summary" text,
	"long_summary" text,
	"public_post_draft" text,
	"internal_log_draft" text,
	"confidence_score" integer DEFAULT 0 NOT NULL,
	"model_name" text,
	"generated_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	CONSTRAINT "activity_daily_summaries_device_date_unique" UNIQUE("device_id","date")
);
--> statement-breakpoint
CREATE TABLE "activity_post_drafts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"device_id" text NOT NULL,
	"target" text NOT NULL,
	"style" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"facts_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activity_notes" ADD COLUMN "project_slug" text;
--> statement-breakpoint
ALTER TABLE "activity_notes" ADD COLUMN "session_id" uuid;
--> statement-breakpoint
CREATE INDEX "activity_rules_enabled_priority_idx" ON "activity_rules" USING btree ("is_enabled","priority");
--> statement-breakpoint
CREATE INDEX "activity_artifacts_device_occurred_idx" ON "activity_artifacts" USING btree ("device_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "activity_artifacts_type_occurred_idx" ON "activity_artifacts" USING btree ("artifact_type","occurred_at");
--> statement-breakpoint
CREATE INDEX "activity_artifacts_project_occurred_idx" ON "activity_artifacts" USING btree ("project_slug","occurred_at");
--> statement-breakpoint
CREATE INDEX "activity_sessions_device_started_idx" ON "activity_sessions" USING btree ("device_id","started_at");
--> statement-breakpoint
CREATE INDEX "activity_sessions_project_started_idx" ON "activity_sessions" USING btree ("project_slug","started_at");
--> statement-breakpoint
CREATE INDEX "activity_daily_summaries_date_idx" ON "activity_daily_summaries" USING btree ("date");
--> statement-breakpoint
CREATE INDEX "activity_post_drafts_date_device_idx" ON "activity_post_drafts" USING btree ("date","device_id");
--> statement-breakpoint
CREATE INDEX "activity_post_drafts_status_idx" ON "activity_post_drafts" USING btree ("status");
