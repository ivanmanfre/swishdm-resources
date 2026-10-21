// "Get this for your product": one row in swishdm_lm_requests (Supabase). The public anon key can only INSERT the
// listed columns (column grant + RLS policy); it cannot read, change or delete anything. Reports are prepared and
// checked by a person, then emailed by hand. Nothing here emails anyone.
const ENDPOINT = 'https://bjbvqvzbzczjbatgmccb.supabase.co/rest/v1/swishdm_lm_requests';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYnZxdnpiemN6amJhdGdtY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDUwODAsImV4cCI6MjA4Mzg4MTA4MH0.yqghcn-Rw5dIFadLhvUASIeUARPvu_CyPOGayI8KyTI';
const form = document.getElementById('request-form');
const fields = document.getElementById('request-fields');
const status = document.getElementById('request-status');
const say = (t, ok) => { status.textContent = t; status.dataset.state = ok ? 'ok' : 'error'; };
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(form);
  if (clean(f.get('website'))) { say('Thanks. We have your request.', true); fields.disabled = true; return; }   // honeypot: look done, send nothing
  let url = clean(f.get('product_url'));
  if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = url.replace(/^http:\/\//i, 'https://');
  form.elements.product_url.value = url;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const row = {name: clean(f.get('name')), email: clean(f.get('email')).toLowerCase(), brand: clean(f.get('brand')), product_url: url,
    category: clean(f.get('category')), consent: form.elements.consent.checked, user_agent: navigator.userAgent.slice(0, 400)};
  fields.disabled = true; say('Sending...', true);
  try {
    const r = await fetch(ENDPOINT, {method: 'POST', headers: {apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal'}, body: JSON.stringify(row)});
    if (r.ok) { say('Thanks, ' + row.name.split(' ')[0] + '. We have your request. A person checks every report before we email it to you.', true); form.reset(); return; }
    if (r.status === 409) { say('We already have a request for that page from this email. We will be in touch.', true); return; }
    fields.disabled = false; say(r.status === 400 ? 'Please check the details: the product page needs to be a full web address.' : 'That did not go through. Please try again in a minute.', false);
  } catch (_) { fields.disabled = false; say('That did not go through. Please try again in a minute.', false); }
});
