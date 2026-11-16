CREATE TABLE "ai_usage" (
	"user_id" text NOT NULL,
	"month" text NOT NULL,
	"scans" integer DEFAULT 0 NOT NULL,
	"ideas" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_user_id_month_pk" PRIMARY KEY("user_id","month")
);
