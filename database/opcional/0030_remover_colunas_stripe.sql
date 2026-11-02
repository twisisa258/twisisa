-- Correr só depois de o código novo (sem Stripe) estar em produção.
DROP INDEX IF EXISTS "subscriptions_stripe_subscription_id_idx";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_customer_id";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_subscription_id";
