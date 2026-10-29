CREATE TYPE "public"."trail_color" AS ENUM('red', 'blue', 'green', 'yellow');--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "trail_color" "trail_color";