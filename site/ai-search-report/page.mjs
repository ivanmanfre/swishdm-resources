// AI search report request: one row in swishdm_lm_requests (lead_magnet 'ai-search-report'). The public anon key can
// only INSERT the listed columns (column grant + RLS policy); it cannot read, change or delete anything. Reports are
// built only for stores at $1M+ a year online and a person checks each one before it is emailed by hand.
// Nothing here emails anyone. A DB trigger flags each new request for a person to check.
const ENDPOINT = 'https://bjbvqvzbzczjbatgmccb.supabase.co/rest/v1/swishdm_lm_requests';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYnZxdnpiemN6amJhdGdtY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDUwODAsImV4cCI6MjA4Mzg4MTA4MH0.yqghcn-Rw5dIFadLhvUASIeUARPvu_CyPOGayI8KyTI';
const QUALIFY = new Set(['1m_5m', '5m_plus']);

// Today | With the change control on phones
for (const ba of document.querySelectorAll('.ba')) {
  const btns = ba.querySelectorAll('.ba-seg button');
  btns.forEach((b) => b.addEventListener('click', () => {
    ba.dataset.v = b.dataset.show;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
}

const form = document.getElementById('request-form');
const fields = document.getElementById('request-fields');
const status = document.getElementById('request-status');
const say = (t, ok) => { status.textContent = t; status.dataset.state = ok ? 'ok' : 'error'; };
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const https = (v) => {
  let u = clean(v);
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/^http:\/\//i, 'https://');
};

function done(qualifies, name, email) {
  const card = document.getElementById(qualifies ? 'done-yes' : 'done-no');
  card.querySelectorAll('[data-name]').forEach((n) => { n.textContent = name; });
  card.querySelectorAll('[data-email]').forEach((n) => { n.textContent = email; });
  form.hidden = true;
  card.hidden = false;
  card.focus({preventScroll: true});
  card.scrollIntoView({behavior: 'smooth', block: 'center'});
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(form);
  const band = clean(f.get('sales_band'));
  const urgency = clean(f.get('urgency'));
  const first = clean(f.get('name')).split(' ')[0];
  if (clean(f.get('website'))) { done(QUALIFY.has(band), first || 'there', clean(f.get('email'))); return; }   // honeypot: look done, send nothing
  const store = https(f.get('store'));
  const page = https(f.get('page'));
  form.elements.store.value = store;
  form.elements.page.value = page;
  if (!form.checkValidity()) {
    form.reportValidity();
    say(!band ? 'Please pick your yearly online sales.' : !urgency ? 'Please pick when you want this sorted.' : 'Please check the details above.', false);
    return;
  }
  let host = '';
  try { host = new URL(store).hostname.replace(/^www\./, ''); } catch (_) { host = store; }
  const row = {lead_magnet: 'ai-search-report', name: clean(f.get('name')), email: clean(f.get('email')).toLowerCase(),
    brand: host.slice(0, 120) || 'unknown', product_url: store, page_url: page || null, category: 'AI search report',
    sales_band: band, urgency, consent: form.elements.consent.checked, user_agent: navigator.userAgent.slice(0, 400)};
  fields.disabled = true; say('Sending...', true);
  try {
    const r = await fetch(ENDPOINT, {method: 'POST', headers: {apikey: ANON, Authorization: 'Bearer ' + ANON,
      'Content-Type': 'application/json', Prefer: 'return=minimal'}, body: JSON.stringify(row)});
    if (r.ok) { say('', true); done(QUALIFY.has(band), first, row.email); return; }
    if (r.status === 409) {
      if (!QUALIFY.has(band)) { say('', true); done(false, first, row.email); return; }
      fields.disabled = false;
      say('We already have a request for this store from this email. We\'ll be in touch.', true);
      return;
    }
    fields.disabled = false;
    say(r.status === 400 ? 'Please check the details: your store and product page need to be full web addresses.' : 'That did not go through. Please try again in a minute.', false);
  } catch (_) { fields.disabled = false; say('That did not go through. Please try again in a minute.', false); }
});
