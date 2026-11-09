// Cloudflare Worker: RSK Chat push sender (OneSignal)
// Variables (Settings -> Variables):  OS_APP_ID, FB_PROJECT, SITE_URL
// Secret (Encrypt):                   OS_KEY   (OneSignal REST API Key)
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type,authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    const out = (b, s = 200) => new Response(b, { status: s, headers: cors });
    if (req.method === 'OPTIONS') return out(null, 204);
    if (req.method !== 'POST') return out('ok');
    try {
      const tok = (req.headers.get('authorization') || '').replace('Bearer ', '');
      const { cid, title, body } = await req.json();
      if (!tok || !cid) return out('bad request', 400);

      // 1) sender ke Firebase token diye chat doc porte dao (member na hole rules block korbe)
      const r = await fetch(
        `https://firestore.googleapis.com/v1/projects/${env.FB_PROJECT}/databases/(default)/documents/chat_chats/${encodeURIComponent(cid)}`,
        { headers: { authorization: 'Bearer ' + tok } }
      );
      if (!r.ok) return out('denied', 403);
      const doc = await r.json();
      const members = (doc.fields?.members?.arrayValue?.values || []).map(v => v.stringValue);
      const muted = doc.fields?.muted?.mapValue?.fields || {};

      // 2) sender uid (token valid prove hoyeche, karon Firestore read hoyeche)
      const p = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const sender = p.user_id || p.sub;
      if (!members.includes(sender)) return out('denied', 403);

      const to = members.filter(u => u !== sender && !muted[u]?.booleanValue);
      if (!to.length) return out('no recipients');

      // 3) OneSignal e pathao
      const res = await fetch('https://api.onesignal.com/notifications?c=push', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Key ' + env.OS_KEY },
        body: JSON.stringify({
          app_id: env.OS_APP_ID,
          target_channel: 'push',
          include_aliases: { external_id: to },
          headings: { en: String(title || 'RSK Chat').slice(0, 60) },
          contents: { en: String(body || 'New message').slice(0, 120) },
          url: env.SITE_URL + '?cid=' + encodeURIComponent(cid),
          data: { cid },
          web_push_topic: 'rsk-' + cid.slice(0, 20)
        })
      });
      return out(await res.text(), res.status);
    } catch (e) {
      return out('error ' + e.message, 500);
    }
  }
};
