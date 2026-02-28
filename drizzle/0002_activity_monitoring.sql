-- Activity Monitoring tables

CREATE TABLE "activity_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"api_key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "activity_minute_agg" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"ts_minute" timestamp with time zone NOT NULL,
	"app" text DEFAULT '' NOT NULL,
	"window_title" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'unknown' NOT NULL,
	"active_sec" integer DEFAULT 0 NOT NULL,
	"afk_sec" integer DEFAULT 0 NOT NULL,
	"keys" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"scroll" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "activity_minute_unique" UNIQUE("device_id","ts_minute","app","window_title","category")
);
--> statement-breakpoint
CREATE TABLE "activity_now" (
	"device_id" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"app" text,
	"window_title" text,
	"category" text DEFAULT 'unknown' NOT NULL,
	"is_afk" boolean DEFAULT false NOT NULL,
	"counts_today_keys" integer DEFAULT 0 NOT NULL,
	"counts_today_clicks" integer DEFAULT 0 NOT NULL,
	"counts_today_scroll" integer DEFAULT 0 NOT NULL,
	"counts_today_active_sec" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_minute_agg" ADD CONSTRAINT "activity_minute_agg_device_id_activity_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."activity_devices"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_now" ADD CONSTRAINT "activity_now_device_id_activity_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."activity_devices"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_minute_ts_idx" ON "activity_minute_agg" USING btree ("device_id","ts_minute");
--> statement-breakpoint
CREATE INDEX "activity_minute_category_idx" ON "activity_minute_agg" USING btree ("category","ts_minute");
