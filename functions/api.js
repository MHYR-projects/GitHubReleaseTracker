export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (request.method === 'GET') {
    if (!key) return new Response(JSON.stringify({ error: 'Key required' }), { status: 400, headers: corsHeaders });
    try {
      const { results } = await env.DB.prepare("SELECT value FROM kv_store WHERE key = ?").bind(key).all();
      if (results && results.length > 0) return new Response(results[0].value, { headers: corsHeaders });
      return new Response(JSON.stringify(null), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify(null), { headers: corsHeaders });
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { key: itemKey, value } = body;

      if (itemKey === 'auth_vault') {
        const { results } = await env.DB.prepare("SELECT value FROM kv_store WHERE key = ?").bind('auth_vault').all();
        if (results && results.length > 0) {
          const existingVault = JSON.parse(results[0].value);
          if (existingVault && existingVault.passwordHash && existingVault.passwordHash !== value.passwordHash) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Password already set' }), { status: 403, headers: corsHeaders });
          }
        }
      }

      await env.DB.prepare(
        `INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`
      ).bind(itemKey, JSON.stringify(value), JSON.stringify(value)).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }
  return new Response('Method not allowed', { status: 405 });
}
