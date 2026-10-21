export const statusLabels = { covered: 'Clear', vague: 'Partial', missing: 'Not found', unknown: 'Check capture' };

export function pageStatus(grade) {
  return grade.flags?.includes('capture_incomplete') && grade.status !== 'covered' ? 'unknown' : grade.status;
}

export function selectRecords(data, engine = 'web', scenario = 'all') {
  return data.records.filter(row => (['web','api'].includes(engine) ? row.channel === engine : row.engine === engine) && (scenario === 'all' || row.scenario === scenario));
}

export function topicStats(criteria, records) {
  return criteria.map(c => {
    const matching = records.filter(row => Object.hasOwn(row.topics, c.id));
    return { ...c, count: matching.length, total: records.length, share: records.length ? matching.length / records.length : 0, examples: matching };
  }).sort((a,b) => b.count - a.count);
}

export function matchProduct(value, pages) {
  try {
    const s = value.trim();
    const u = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`);
    if (!['https:','http:'].includes(u.protocol) || u.username || u.password || u.port) return null;
    const normal = v => v.replace(/\/+$/, '') || '/';
    return pages.find(p => {
      const candidate = new URL(p.url);
      return u.hostname.toLowerCase().replace(/^www\./,'') === candidate.hostname.replace(/^www\./,'') && normal(u.pathname) === normal(candidate.pathname);
    }) || null;
  } catch { return null; }
}

export function actionsFor(data, page, extra = new Set()) {
  if (page.capture_incomplete) return [{ id:'check-capture', name:'Check the full product page', status:'unknown', gap:'The saved extract is incomplete. Confirm the full rendered page before assigning content edits.', quote:'', reason:'A fair page comparison needs a complete capture.' }];
  const stats = topicStats(data.criteria, selectRecords(data,'web','all'));
  return stats.map(c => ({...page.grades.find(g => g.id===c.id), name:c.name, count:c.count, total:c.total})).filter(g => pageStatus(g)!=='covered' || extra.has(g.id));
}

export function actionInstruction(g) {
  if(g.id==='check-capture') return g.gap;
  if(g.id==='warranty' && g.flags?.includes('raw_html_links_to_warranty_policy')) return 'Open the linked warranty policy first. If the terms are clear there, make that route easy to find beside the product details.';
  if(g.flags?.includes('conflicting_manufacturer_dimensions')) return 'Confirm the correct width with the product team, then make the specification and product description agree.';
  if(g.status==='missing') return `${g.gap} Check the full page and linked information, then add a clear answer if it is still absent.`;
  return g.gap || g.optional_suggestions?.[0] || 'Check this fact against the current product and keep the page information consistent.';
}

export function buildReportText(data, page, records, done, extra) {
  const lines = ['SwishDM | AI product-page check', 'Private review version', '', page.product, page.url,
    `Research: ${data.studyDate}. Page review: ${data.reviewDate}.`, `${records.length} selected answers.`,
    `Scope: ${[...new Set(records.map(r=>data.engines[r.engine]))].join(', ')}.`,
    `Shopping questions: ${[...new Set(records.map(r=>data.scenarios[r.scenario]))].join(', ')}.`, '',
    'Pilot: fewer than 100 repeats per question. Full SwishDM studies require at least 100. Topic mentions describe this sample. Internal ranking rules remain unknown.', '',
    'PAGE CAPTURE', page.capture_method, ...page.capture_limitations, '', 'ACTION LIST'];
  for (const g of actionsFor(data,page,extra)) lines.push(`[${done.has(g.id)?'x':' '}] ${g.name}`,actionInstruction(g), ...(g.optional_suggestions||[]).map(x=>`Optional: ${x}`),'');
  lines.push('PAGE EVIDENCE');
  for (const c of topicStats(data.criteria,records)) {
    const g=page.grades.find(g=>g.id===c.id);
    lines.push('', `${c.name}: ${statusLabels[pageStatus(g)]}. Topic appears in ${c.count}/${c.total} selected answers.`,g.quote?`Page quote: "${g.quote}"`:'No page quote retained for this finding.',...(g.support_quotes||[]).map(q=>`Supporting page quote: "${q}"`),g.reason || '',g.gap || '');
    if(c.examples.length) { const ex=c.examples[0]; lines.push(`AI excerpt (${data.engines[ex.engine]}, ${ex.id}): "${ex.topics[c.id]}"`, `Question: ${ex.prompt}`); }
  }
  lines.push('', 'Check the live page and linked policies before publishing changes. AI answers may contain factual errors. The list is a record of page information and work completed; ticking a box does not rescore the page.');
  return lines.filter(x=>x!==undefined && x!==null).join('\n');
}
