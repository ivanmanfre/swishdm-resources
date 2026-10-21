import { selectRecords, topicStats, pageStatus, matchProduct, actionsFor, actionInstruction, buildReportText, statusLabels } from './core.mjs';

const $ = s => document.querySelector(s);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL = value => { try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)?u.href:'#'; } catch { return '#'; } };
const badge = grade => `<span class="status ${pageStatus(grade)}">${statusLabels[pageStatus(grade)]}</span>`;
let data, page, records=[], stats=[], answersPromise, dialogSource, toastTimer, answerRequest=0;
let saved={}, canSave=true;
const storageKey='swishdm-product-check-20261017-v1';
try { saved=JSON.parse(localStorage.getItem(storageKey)||'{}'); if(!saved || Array.isArray(saved) || typeof saved!=='object') saved={}; } catch { canSave=false; }
const progress=()=>{ const stored=saved[page.stem]; if(!stored||!Array.isArray(stored.done)||!Array.isArray(stored.extra)) saved[page.stem]={done:[],extra:[]}; return saved[page.stem]; };
const save=()=>{ try { localStorage.setItem(storageKey,JSON.stringify(saved)); } catch { canSave=false; } updateStorageMessage(); };
const updateStorageMessage=()=>{ $('#save-state').textContent=canSave?'Progress is saved in this browser. Ticks record your work; they do not rescore the page.':'This browser cannot save progress. Keep this tab open and download your list before leaving.'; };
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').hidden=false; toastTimer=setTimeout(()=>$('#toast').hidden=true,3500); }

function renderHero() {
  const top=topicStats(data.criteria,selectRecords(data,'web','all')).slice(0,3);
  $('#hero-bars').innerHTML=top.map(c=>`<div class="mini-bar"><span>${escapeHTML(c.name)}</span><b>${Math.round(c.share*100)}%</b><div class="mini-track"><i style="width:${c.share*100}%"></i></div></div>`).join('');
}

function renderSummary() {
  $('#product-title').textContent=page.product;
  $('#product-link').href=page.url;
  const counts={covered:0,vague:0,missing:0,unknown:0};
  page.grades.forEach(g=>counts[pageStatus(g)]++);
  $('#coverage-count').innerHTML=`${counts.covered}<small> / ${page.grades.length}</small>`;
  $('#coverage-track').innerHTML=page.grades.map(g=>`<i class="${pageStatus(g)}"></i>`).join('');
  $('#coverage-legend').innerHTML=Object.entries(counts).filter(([,n])=>n).map(([s,n])=>`<span class="${s}">${n} ${statusLabels[s].toLowerCase()}</span>`).join('');
  const need=page.grades.filter(g=>pageStatus(g)!=='covered');
  $('#product-verdict').textContent=page.capture_incomplete?
    'The capture contains useful product facts, but some page content is missing from the extract. Check the complete page before assigning edits or comparing coverage.' :
    `The captured page clearly answers ${counts.covered} of these ${page.grades.length} topics. ${need.length ? 'The remaining findings are listed below, with the evidence and what to check next.' : 'Use the source quotes to check the details and keep them current.'}`;
  const captureNotes={
    'aer-travel-pack-4':'This page links to a separate warranty policy. We have not checked that policy.',
    'tortuga-40l':'Customer reviews refer to more than one size or version. We prioritise the brand’s own product details.',
    'osprey-farpoint-40':'We needed a browser-rendered copy to read this page. The captured price depends on the option selected.',
    'cotopaxi-allpa-35':'Some content was missing from the saved page text. Check the full page before assigning edits.',
    'tomtoc-40l':'Two different widths appear in the saved page. Confirm the correct measurement before editing.'
  };
  $('#capture-note').innerHTML=`<strong>About this capture.</strong> ${escapeHTML(captureNotes[page.stem])}`;
}

function refreshTopics() {
  records=selectRecords(data,$('#engine').value,$('#scenario').value);
  stats=topicStats(data.criteria,records);
  const source=$('#engine').selectedOptions[0].textContent;
  const scenario=$('#scenario').selectedOptions[0].textContent;
  $('#sample-description').textContent=`${records.length} recorded answers · ${source} · ${scenario}. Showing ${$('#coverage-filter').selectedOptions[0].textContent.toLowerCase()}. Collected 16 October.`;
  const filter=$('#coverage-filter').value;
  const visible=stats.filter(c=>{ const s=pageStatus(page.grades.find(g=>g.id===c.id)); return filter==='all'||(filter==='gaps'?s!=='covered':s==='covered'); });
  $('#topics-empty').hidden=visible.length>0;
  $('#topics-list').innerHTML=visible.map(c=>{
    const g=page.grades.find(g=>g.id===c.id), state=pageStatus(g), ex=c.examples[0];
    const rubric=data.review.rubric[c.id];
    const isAdded=progress().extra.includes(c.id)||g.status!=='covered';
    const isUnknown=state==='unknown';
    const evidenceLabel=isUnknown?'Capture needs checking':g.quote?'What the captured page says':'What we could find';
    return `<details class="topic" id="topic-${c.id}"><summary><span class="topic-name">${escapeHTML(c.name)}</span><span class="topic-frequency"><span class="bar-track" aria-hidden="true"><i style="width:${c.share*100}%"></i></span><strong>${records.length?Math.round(c.share*100)+'%':'n/a'}</strong><small>${c.count} of ${c.total} selected answers</small></span>${badge(g)}<span class="expand-icon" aria-hidden="true">+</span></summary><div class="topic-body"><div class="evidence-grid"><div><h4>Why this topic appears</h4>${ex?`<blockquote class="quote ai">${escapeHTML(ex.topics[c.id])}</blockquote><span class="quote-meta">${escapeHTML(data.engines[ex.engine])} / recorded 16 October</span><button type="button" class="text-button" data-answer="${escapeHTML(ex.id)}">Read the complete answer</button>`:'<p>No mentions of this topic in the selected answers. Try another tool or question.</p>'}<p class="help">The quote is an example of this broad topic. It may describe another product or give general buying advice.</p></div><div><h4>${evidenceLabel}</h4>${g.quote?`<blockquote class="quote">${escapeHTML(g.quote)}</blockquote>${g.support_quotes?.length?`<details class="support-evidence"><summary>More page evidence</summary>${g.support_quotes.map(q=>`<blockquote class="quote">${escapeHTML(q)}</blockquote>`).join('')}</details>`:''}`:`<p>${isUnknown?'The saved extract cannot support a complete judgement here.':'No supporting answer was retained in the reviewed page capture.'}</p>`}<p>${escapeHTML(g.reason)}</p>${g.flags?.includes('customer_review_only')?'<p class="help">This wording comes from a customer review. Confirm it against a brand statement.</p>':''}${g.flags?.includes('structured_data_only')?'<p class="help">Evidence is in the page’s product data. Check that a shopper can also read it on the page.</p>':''}<a class="source-link" href="${escapeHTML(page.url)}" target="_blank" rel="noopener noreferrer">Check the live product page ↗</a></div></div><details class="rubric-detail"><summary>What counts as a clear answer?</summary><p>${escapeHTML(rubric.covered_when)}</p></details><div class="evidence-next"><div><p><strong>${state==='covered'?'A useful next check':isUnknown?'Check the capture first':'What to check next'}</strong></p><p>${escapeHTML(g.gap || g.optional_suggestions?.[0] || 'Keep this fact consistent across the visible page and product data when the product changes.')}</p></div><button class="button button-outline" type="button" data-add="${c.id}">${page.capture_incomplete?'View capture check':isAdded?'View action list':'Add to action list'}</button></div></div></details>`;
  }).join('');
  renderVisibility();
}

function renderComparison() {
  const competitor=data.pages.find(p=>p.stem===$('#competitor').value);
  if(!competitor) return;
  $('#comparison-primary').textContent=page.product;
  $('#comparison-head').innerHTML=`<tr><th scope="col">Product topic</th><th scope="col">${escapeHTML(page.product)}<span class="table-source">Your selected page</span></th><th scope="col">${escapeHTML(competitor.product)}<a class="table-source" target="_blank" rel="noopener noreferrer" href="${escapeHTML(competitor.url)}">View source page ↗</a></th></tr>`;
  $('#comparison-body').innerHTML=data.criteria.map(c=>`<tr><th scope="row"><button class="text-button" type="button" data-topic="${c.id}">${escapeHTML(c.name)}</button></th><td>${badge(page.grades.find(g=>g.id===c.id))}</td><td>${badge(competitor.grades.find(g=>g.id===c.id))}</td></tr>`).join('');
  const warnings=[page,competitor].filter(p=>p.capture_incomplete||p.meta.js_rendered).map(p=>p.capture_incomplete?`${p.brand}: the extract is incomplete. Treat this comparison as provisional and check the full page.`:`${p.brand}: captured in a rendered browser; the other capture may contain different page content.`);
  $('#compare-notice').hidden=!warnings.length;
  $('#compare-notice').textContent=warnings.join(' ');
}

function renderVisibility() {
  let holder=$('#visibility');
  if(!holder){holder=document.createElement('div');holder.id='visibility';holder.className='visibility-note';$('#comparison').append(holder);}
  const brand=page.brand.toLowerCase(),domain=new URL(page.url).hostname.replace(/^www\./,'');
  const mentioned=records.filter(r=>r.brands.includes(brand)).length;
  const linked=records.filter(r=>r.links.some(u=>{try{return new URL(u).hostname.replace(/^www\./,'')===domain;}catch{return false;}})).length;
  const sources=records.filter(r=>r.links.length).length;
  holder.innerHTML=`<h3>Being named and being linked are separate.</h3><p>In the ${records.length} answers selected above, <strong>${mentioned} name ${escapeHTML(page.brand)}</strong> and <strong>${linked} include a captured link to ${escapeHTML(domain)}</strong>.</p><p class="help">Source links were returned for ${sources} of these ${records.length} answers. Missing source data can undercount links. These are brand-domain links, which can lead to any page on the site; they do not establish traffic or explain why a model chose a product.</p>`;
}

function renderActions() {
  const rows=actionsFor(data,page,new Set(progress().extra));
  $('#action-count').textContent=rows.length;
  $('#action-list').innerHTML=rows.length?rows.map(g=>{
    const checked=progress().done.includes(g.id);
    return `<article class="action-item ${checked?'done':''}"><div class="action-top"><input type="checkbox" id="action-${g.id}" data-done="${g.id}" ${checked?'checked':''}><label for="action-${g.id}">${escapeHTML(g.name)}</label></div><p>${escapeHTML(actionInstruction(g))}</p><div class="action-meta">${g.id==='check-capture'?'<span>Capture check before content edits</span>':`<span>${statusLabels[pageStatus(g)]} in this capture</span><span>${g.count} of ${g.total} web answers mention the topic</span><button type="button" data-topic="${g.id}">Review evidence</button>`}</div></article>`;
  }).join(''):'<div class="empty">The captured page clearly answers every topic. You can add optional checks from the topic rows above.</div>';
  updateStorageMessage();
}

function choosePage(stem) {
  page=data.pages.find(p=>p.stem===stem)||data.pages[0];
  $('#product').value=page.stem;
  const previous=$('#competitor').value;
  $('#competitor').innerHTML=data.pages.filter(p=>p.stem!==page.stem).map(p=>`<option value="${p.stem}">${escapeHTML(p.product)}</option>`).join('');
  if(previous!==page.stem&&data.pages.some(p=>p.stem===previous)) $('#competitor').value=previous;
  renderSummary();refreshTopics();renderComparison();renderActions();
  const u=new URL(location.href);u.searchParams.set('product',page.stem);history.replaceState(null,'',u);
}

function openTopic(id) {
  const c=page.grades.find(g=>g.id===id);
  const filter=$('#coverage-filter').value;
  if(filter==='covered'&&pageStatus(c)!=='covered'||filter==='gaps'&&pageStatus(c)==='covered') {$('#coverage-filter').value='all';refreshTopics();}
  const el=document.getElementById(`topic-${id}`);if(el){el.open=true;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});el.querySelector('summary').focus({preventScroll:true});}
}

async function openAnswer(id, trigger) {
  const record=data.records.find(r=>r.id===id);if(!record)return;
  const request=++answerRequest;
  dialogSource=trigger;
  $('#evidence-title').textContent=data.engines[record.engine];
  $('#evidence-content').innerHTML='<p role="status">Loading the recorded answer…</p>';
  $('#evidence-dialog').showModal();
  try {
    if(!answersPromise) answersPromise=fetch('answers.json').then(result=>{if(!result.ok)throw Error('Source file unavailable');return result.json();}).catch(error=>{answersPromise=null;throw error;});
    const answers=await answersPromise;
    if(request!==answerRequest || !$('#evidence-dialog').open)return;
    const answer=answers[id];if(!answer)throw Error('This answer is unavailable');
    $('#evidence-content').innerHTML=`<p class="help">Captured ${escapeHTML(new Date(answer.date).toLocaleString('en-GB',{dateStyle:'long',timeStyle:'short',timeZone:'UTC'}))} UTC. Original wording is retained and may include factual errors.</p><h3>The question</h3><p>${escapeHTML(answer.prompt)}</p><h3>The recorded answer</h3><pre class="answer-text" tabindex="0">${escapeHTML(answer.answer)}</pre><h3>Links returned with this answer</h3>${answer.links.length?`<ul class="source-list">${answer.links.map(url=>`<li><a href="${escapeHTML(safeURL(url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(url)}</a></li>`).join('')}</ul>`:'<p>No source links were returned with this capture. This does not establish that the live answer had no links.</p>'}`;
  } catch { if(request===answerRequest && $('#evidence-dialog').open) $('#evidence-content').innerHTML='<p role="alert">The saved answer could not be loaded. Close this window and try again. The excerpt on the report is still available.</p>'; }
}

function renderMethod() {
  $('#question-list').innerHTML=Object.entries(data.scenarios).map(([id,name])=>{
    const questions=[...new Set(data.records.filter(r=>r.scenario===id).map(r=>r.prompt))];
    return `<div class="question-list-item"><strong>${escapeHTML(name)}</strong>${questions.map(q=>`<p>“${escapeHTML(q)}”</p>`).join('')}</div>`;
  }).join('');
  $('#engine-counts').innerHTML=`<div class="engine-list">${Object.entries(data.engines).map(([id,name])=>`<p><span>${escapeHTML(name)}</span><strong>${data.records.filter(r=>r.engine===id).length}</strong></p>`).join('')}</div>`;
  const info=document.createElement('p');info.textContent=`During packaging, ${data.quality.droppedQuotes} extracted quote items did not pass the exact-text check and were left out. The charts use only retained, verified quote items. The recorded answers remain available in full.`;
  document.querySelectorAll('.method-details>details')[1].querySelector('div').append(info);
}

async function init() {
  try {
    const response=await fetch('research.json');if(!response.ok)throw Error('Research unavailable');data=await response.json();
    $('#product').innerHTML=data.pages.map(p=>`<option value="${p.stem}">${escapeHTML(p.product)}</option>`).join('');
    $('#product').disabled=false;
    $('#engine').innerHTML='<option value="web">All web captures</option>'+Object.entries(data.engines).filter(([id])=>!['oai','gem'].includes(id)).map(([id,name])=>`<option value="${id}">${escapeHTML(name)}</option>`).join('')+'<optgroup label="Separate API cross-checks"><option value="api">Both API cross-checks</option>'+['oai','gem'].map(id=>`<option value="${id}">${escapeHTML(data.engines[id])}</option>`).join('')+'</optgroup>';
    $('#scenario').innerHTML='<option value="all">All shopping questions</option>'+Object.entries(data.scenarios).map(([id,name])=>`<option value="${id}">${escapeHTML(name)}</option>`).join('');
    renderHero();renderMethod();choosePage(new URL(location.href).searchParams.get('product'));$('#report-content').hidden=false;
    $('#product').addEventListener('change',()=>choosePage($('#product').value));
    ['engine','scenario','coverage-filter'].forEach(id=>document.getElementById(id).addEventListener('change',refreshTopics));
    $('#competitor').addEventListener('change',renderComparison);
    $('#reset-filters').addEventListener('click',()=>{$('#engine').value='web';$('#scenario').value='all';$('#coverage-filter').value='all';refreshTopics();});
    $('#url-form').addEventListener('submit',event=>{
      event.preventDefault();const found=matchProduct($('#product-url').value,data.pages);
      $('#url-error').hidden=!!found;$('#product-url').setAttribute('aria-invalid',String(!found));
      if(found){choosePage(found.stem);$('#product-title').scrollIntoView({block:'center'});toast(`Opened the saved report for ${found.brand}.`);}else{$('#url-error').textContent='We have no saved report for that page. Request a check for it below. Nothing was submitted or scanned.';{const rq=document.getElementById('rq-url');if(rq&&!rq.value)rq.value=$('#product-url').value.trim();};$('#product-url').focus();}
    });
    document.addEventListener('click',event=>{
      const source=event.target.closest('[data-answer]');if(source)openAnswer(source.dataset.answer,source);
      const topic=event.target.closest('[data-topic]');if(topic)openTopic(topic.dataset.topic);
      const add=event.target.closest('[data-add]');if(add){const id=add.dataset.add;const g=page.grades.find(g=>g.id===id);if(g.status==='covered'&&!progress().extra.includes(id)&&!page.capture_incomplete){progress().extra.push(id);save();renderActions();add.textContent='View action list';toast('Added to your action list.');}$('#actions').scrollIntoView({block:'start'});}
    });
    $('#action-list').addEventListener('change',event=>{if(!event.target.matches('[data-done]'))return;const id=event.target.dataset.done;progress().done=progress().done.filter(x=>x!==id);if(event.target.checked)progress().done.push(id);save();event.target.closest('.action-item').classList.toggle('done',event.target.checked);});
    $('#reset-checklist').addEventListener('click',()=>{progress().done=[];progress().extra=[];save();renderActions();refreshTopics();toast('Checklist reset for this product.');});
    $('#download').addEventListener('click',()=>{const text=buildReportText(data,page,records,new Set(progress().done),new Set(progress().extra));const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`swishdm-${page.stem}-action-list.txt`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your action list has been downloaded.');});
    let printOpen=new Set();
    const printDetails=()=>document.querySelectorAll('.topic,.support-evidence');
    window.addEventListener('beforeprint',()=>{printOpen=new Set([...printDetails()].filter(el=>el.open));printDetails().forEach(el=>el.open=true);});
    window.addEventListener('afterprint',()=>printDetails().forEach(el=>el.open=printOpen.has(el)));
    $('#print').addEventListener('click',()=>window.print());
    $('#close-dialog').addEventListener('click',()=>$('#evidence-dialog').close());
    $('#evidence-dialog').addEventListener('close',()=>dialogSource?.focus());
    $('#evidence-dialog').addEventListener('click',event=>{if(event.target===$('#evidence-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
  } catch(error) {
    $('#load-error').hidden=false;$('#load-error').innerHTML='The saved research could not be loaded. <button type="button" class="text-button" id="reload">Try again</button>';
    $('#reload').addEventListener('click',()=>location.reload());$('#hero-bars').textContent='The saved research is temporarily unavailable. Try reloading the page.';
    console.error('Research load failed:',error);
  }
}
init();
