export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // هدرهای CORS برای ارتباط با فرانت‌اند
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // گرفتن اطلاعات (GET)
    if (request.method === "GET") {
      const key = url.searchParams.get("key");
      const stmt = env.DB.prepare("SELECT value FROM kv_store WHERE key = ?");
      const result = await stmt.bind(key).first();
      
      return new Response(result ? result.value : JSON.stringify(null), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ذخیره اطلاعات (POST)
    if (request.method === "POST") {
      const body = await request.json();
      const { key, value } = body;

      const stmt = env.DB.prepare(
        "INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?"
      );
      await stmt.bind(key, JSON.stringify(value), JSON.stringify(value)).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
