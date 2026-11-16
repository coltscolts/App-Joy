CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"day" text NOT NULL,
	"date" text NOT NULL,
	"end_date" text,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"time" text,
	"location" text,
	"place_id" text,
	"city" text,
	"distance" text,
	"description" text,
	"kid_friendly" boolean,
	"budget" text,
	"confirmation_number" text,
	"flight_number" text,
	"details" text,
	"status" text,
	"reminder_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"trip_type" text DEFAULT 'single' NOT NULL,
	"destination" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"adults" integer DEFAULT 2 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"cover_image" text,
	"stops" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;