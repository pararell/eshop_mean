ALTER TYPE "public"."order_status" ADD VALUE 'PENDING_PAYMENT';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'PAYMENT_FAILED';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'REFUNDED';--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_intent_id_unique" UNIQUE("payment_intent_id");