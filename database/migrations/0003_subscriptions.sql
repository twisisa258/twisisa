-- Subscrições Stripe. Uma linha por utilizador; actualizada pelo webhook.
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL,
  "status" text NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_idx"
  ON "subscriptions" ("stripe_subscription_id");
