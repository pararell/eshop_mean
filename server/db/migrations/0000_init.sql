CREATE TYPE "public"."lang_code" AS ENUM('en', 'sk', 'cs');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('NEW', 'PAID', 'SHIPPING', 'COMPLETED', 'CANCELED');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"title_url" text NOT NULL,
	"main_image_url" text,
	"main_image_name" text,
	"main_image_cover" boolean DEFAULT false NOT NULL,
	"sub_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_title_url_unique" UNIQUE("title_url")
);
--> statement-breakpoint
CREATE TABLE "category_translations" (
	"category_id" uuid NOT NULL,
	"lang" "lang_code" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer,
	"visibility" boolean DEFAULT false NOT NULL,
	"menu_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "category_translations_category_id_lang_pk" PRIMARY KEY("category_id","lang")
);
--> statement-breakpoint
CREATE TABLE "config_shipping" (
	"config_id" uuid NOT NULL,
	"lang" "lang_code" NOT NULL,
	"basic_cost" numeric(12, 2),
	"basic_limit" numeric(12, 2),
	"extended_cost" numeric(12, 2),
	"extended_limit" numeric(12, 2),
	CONSTRAINT "config_shipping_config_id_lang_pk" PRIMARY KEY("config_id","lang")
);
--> statement-breakpoint
CREATE TABLE "configs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"title_url" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configs_title_url_unique" UNIQUE("title_url")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid,
	"customer_email" text NOT NULL,
	"status" "order_status" DEFAULT 'NEW' NOT NULL,
	"type" text,
	"currency" char(3) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"amount_refunded" numeric(12, 2),
	"notes" text,
	"card_id" text,
	"seller_message" text,
	"description" text,
	"cart" jsonb NOT NULL,
	"addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "page_translations" (
	"page_id" uuid NOT NULL,
	"lang" "lang_code" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content_html" text DEFAULT '' NOT NULL,
	CONSTRAINT "page_translations_page_id_lang_pk" PRIMARY KEY("page_id","lang")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"title_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_title_url_unique" UNIQUE("title_url")
);
--> statement-breakpoint
CREATE TABLE "product_translations" (
	"product_id" uuid NOT NULL,
	"lang" "lang_code" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"description_full" text[] DEFAULT '{}'::text[] NOT NULL,
	"regular_price" numeric(12, 2),
	"sale_price" numeric(12, 2),
	"on_sale" boolean DEFAULT false NOT NULL,
	"stock" text,
	"visibility" boolean DEFAULT false NOT NULL,
	"shipping" text DEFAULT 'basic' NOT NULL,
	CONSTRAINT "product_translations_product_id_lang_pk" PRIMARY KEY("product_id","lang")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"title_url" text NOT NULL,
	"main_image_url" text,
	"main_image_name" text,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_title_url_unique" UNIQUE("title_url")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"title_url" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"styles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "themes_title_url_unique" UNIQUE("title_url")
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"lang" "lang_code" PRIMARY KEY NOT NULL,
	"keys" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text,
	"google_id" text,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_shipping" ADD CONSTRAINT "config_shipping_config_id_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "configs_one_active" ON "configs" USING btree ("active") WHERE "configs"."active";--> statement-breakpoint
CREATE INDEX "orders_user_created" ON "orders" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_created" ON "orders" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "product_translations_listing" ON "product_translations" USING btree ("lang","visibility","sale_price");--> statement-breakpoint
CREATE INDEX "products_tags_gin" ON "products" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "products_created_at" ON "products" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "session_expire" ON "session" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "themes_one_active" ON "themes" USING btree ("active") WHERE "themes"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));