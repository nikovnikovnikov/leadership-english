import { NextResponse } from "next/server";
import { stripe, appUrl } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

function resolvePriceId(plan: string | null): string | null {
  if (plan === "yearly") {
    return process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_ID || null;
  }
  return process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_ID || null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let plan: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    plan = body.plan ?? null;
  } catch {
    // ignore
  }

  const priceId = resolvePriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "No Stripe price configured. Set STRIPE_PRICE_MONTHLY or STRIPE_PRICE_ID." },
      { status: 500 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, username")
    .eq("id", user.id)
    .single();

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/account?success=1`,
      cancel_url: `${appUrl()}/account?canceled=1`,
      customer_email: profile?.email ?? user.email ?? undefined,
      metadata: { user_id: user.id, username: profile?.username, plan: plan ?? "monthly" },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return NextResponse.json(
      { error: "Could not start checkout. Is STRIPE_PRICE_MONTHLY set?" },
      { status: 500 },
    );
  }
}
