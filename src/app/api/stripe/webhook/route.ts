import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const SUBSCRIPTION_STATUS: Record<
  Stripe.Subscription.Status,
  string
> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "unpaid",
  incomplete: "incomplete",
  incomplete_expired: "incomplete_expired",
  paused: "paused",
};

function upsertSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  args: {
    userId: string;
    customerId: string | null;
    subscriptionId: string | null;
    status: string;
    currentPeriodEnd: string | null;
  },
) {
  return supabase.from("subscriptions").upsert(
    {
      user_id: args.userId,
      stripe_customer_id: args.customerId,
      stripe_subscription_id: args.subscriptionId,
      status: args.status,
      current_period_end: args.currentPeriodEnd,
    },
    { onConflict: "user_id" },
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = String(session.metadata?.user_id ?? "");
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;

      let status = "active";
      let currentPeriodEnd: string | null = null;
      if (subscriptionId) {
        const sub = await stripe().subscriptions.retrieve(subscriptionId);
        status = SUBSCRIPTION_STATUS[sub.status] ?? sub.status;
        const periodEnd = sub.items?.data?.[0]?.current_period_end;
        currentPeriodEnd = periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null;
      }

      if (userId) {
        await upsertSubscription(supabase, {
          userId,
          customerId,
          subscriptionId,
          status,
          currentPeriodEnd,
        });

        // Record user access type as subscription
        await supabase.from("user_access").upsert(
          { user_id: userId, access_type: "subscription" },
          { onConflict: "user_id" },
        );
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (existing) {
        const periodEnd = sub.items?.data?.[0]?.current_period_end;
        await upsertSubscription(supabase, {
          userId: existing.user_id,
          customerId,
          subscriptionId: sub.id,
          status: SUBSCRIPTION_STATUS[sub.status] ?? sub.status,
          currentPeriodEnd: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        });
      }
      break;
    }

    case "customer.subscription.trial_will_end":
      // No action needed for now.
      break;

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
