import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const cronSecret = required("CRON_SECRET");
  if (request.headers.get("x-cron-secret") !== cronSecret) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  webpush.setVapidDetails(required("VAPID_SUBJECT"), required("VAPID_PUBLIC_KEY"), required("VAPID_PRIVATE_KEY"));

  const { data: dueItems, error: dueError } = await supabase.rpc("due_notifications");
  if (dueError) throw dueError;

  let sent = 0;
  for (const item of dueItems ?? []) {
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", item.user_id);
    if (subscriptionsError) throw subscriptionsError;

    for (const subscription of subscriptions ?? []) {
      const { data: priorDelivery } = await supabase
        .from("push_deliveries")
        .select("id")
        .eq("subscription_id", subscription.id)
        .eq("item_id", item.item_id)
        .eq("sent_on", new Date().toISOString().slice(0, 10))
        .maybeSingle();
      if (priorDelivery) continue;

      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: item.title, body: item.body, href: item.href, tag: item.item_id }));
        await supabase.from("push_deliveries").insert({ subscription_id: subscription.id, item_id: item.item_id });
        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }

  return Response.json({ ok: true, sent });
});
