// The guide's email gate: one row in swishdm_lm_requests (lead_magnet 'ai-view-guide', product_url = their store).
// The public anon key can only INSERT the listed columns (column grant + RLS policy); it cannot read, change or
// delete anything. The guide opens on the page once the row is in (or was already in). Nothing here emails anyone.
const ENDPOINT = 'https://bjbvqvzbzczjbatgmccb.supabase.co/rest/v1/swishdm_lm_requests';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYnZxdnpiemN6amJhdGdtY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDUwODAsImV4cCI6MjA4Mzg4MTA4MH0.yqghcn-Rw5dIFadLhvUASIeUARPvu_CyPOGayI8KyTI';
const KEY = 'swishdm-ai-view-guide';
const form = document.getElementById('gate-form');
const fields = document.getElementById('gate-fields');
const status = document.getElementById('gate-status');
const guide = document.getElementById('guide');
const say = (t, ok) => { status.textContent = t; status.dataset.state = ok ? 'ok' : 'error'; };
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();

function openGuide(scroll) {
  guide.hidden = false;
  try { localStorage.setItem(KEY, '1'); } catch (_) { /* private mode */ }
  if (scroll) guide.scrollIntoView({behavior: 'smooth', block: 'start'});
}
try { if (localStorage.getItem(KEY) === '1') openGuide(false); } catch (_) { /* private mode */ }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(form);
  if (clean(f.get('website'))) { say('Thanks.', true); fields.disabled = true; return; }   // honeypot: look done, send nothing
  let url = clean(f.get('product_url'));
  if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = url.replace(/^http:\/\//i, 'https://');
  form.elements.product_url.value = url;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (_) { host = url; }
  const row = {lead_magnet: 'ai-view-guide', name: clean(f.get('name')), email: clean(f.get('email')).toLowerCase(),
    brand: host.slice(0, 120) || 'unknown', product_url: url, category: 'AI view guide', consent: form.elements.consent.checked,
    user_agent: navigator.userAgent.slice(0, 400)};
  fields.disabled = true; say('Opening the guide...', true);
  try {
    const r = await fetch(ENDPOINT, {method: 'POST', headers: {apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal'}, body: JSON.stringify(row)});
    if (r.ok || r.status === 409) { say('Thanks, ' + row.name.split(' ')[0] + '. The guide is just below.', true); openGuide(true); return; }
    fields.disabled = false;
    say(r.status === 400 ? 'Please check the details: your store needs to be a full web address.' : 'That did not go through. Please try again in a minute.', false);
  } catch (_) { fields.disabled = false; say('That did not go through. Please try again in a minute.', false); }
});

document.getElementById('copy-note').addEventListener('click', async (e) => {
  const t = document.getElementById('dev-note');
  try { await navigator.clipboard.writeText(t.value); } catch (_) { t.select(); document.execCommand('copy'); }
  e.currentTarget.textContent = 'Copied';
});
