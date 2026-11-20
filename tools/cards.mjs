// Link-preview cards for report pages, drawn at deploy time from each page's own <meta name="swishdm:card"> tag.
// node tools/cards.mjs site/compare  -> writes <token>/card.png beside every index.html that carries the tag.
// A page whose tag can not be drawn gets the generic card (site/media/report-card.png). Pages without the tag are skipped.
// Always exits 0: a card never blocks a deploy. Nothing is committed back; the PNGs exist only in the deployed artifact.
// node tools/cards.mjs --generic <out.png>  -> draws the generic card.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONTS = [path.join(HERE, 'fonts', 'Oswald-SemiBold.ttf'), path.join(HERE, 'fonts', 'Lato-Regular.ttf')];
const GENERIC = path.join(HERE, '..', 'site', 'media', 'report-card.png');
const LOGO = path.join(HERE, '..', 'site', 'ai-view', 'img', 'logo.png');
const C = { cream: '#FAF7F0', o: '#FC5B06', n: '#010D68', ink: '#0b1240', mut: '#5a6185', line: '#e3dfd2' };
const TONE = { own: C.o, riv: C.n, flag: C.ink };
const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/* Greedy word wrap to `max` lines of `width` characters; the last kept line ends with an ellipsis when text is left over. */
export function wrap(text, width, max) {
  const words = String(text).trim().split(/\s+/).filter(Boolean), lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    if (w.length > width) w = w.slice(0, width - 1) + '…';
    const next = cur ? cur + ' ' + w : w;
    if (next.length <= width) { cur = next; continue; }
    lines.push(cur); cur = w;
    if (lines.length === max) { cur = null; break; }
  }
  if (cur) lines.push(cur);
  const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (lines.length > max || used < words.length) {
    lines.length = Math.min(lines.length, max);
    let last = lines[max - 1] || '';
    while (last.length + 1 > width && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
    lines[max - 1] = last.replace(/[\s.,;:]+$/, '') + '…';
  }
  return lines;
}
function logoTag() {
  try { const b = fs.readFileSync(LOGO).toString('base64'); return '<image href="data:image/png;base64,' + b + '" x="64" y="52" height="52" width="215" preserveAspectRatio="xMinYMid meet"/>'; } catch (e) { return ''; }
}
export function svgFor(c) {
  const tone = TONE[c.tone] || C.n;
  const title = wrap(c.brand + ' in ChatGPT and Gemini', 40, 2);
  const lines = wrap(c.line, 34, 4);
  const num = String(c.n), of = 'of ' + c.of;
  // a brand count of 0 or 1 is never drawn large (no negative-count opener): the stamp from the page stands in its place
  const small = c.tone === 'own' && c.n <= 1 && typeof c.stamp === 'string' && c.stamp.trim();
  const big = small
    ? wrap(c.stamp.toUpperCase(), 16, 3).map((t, i) => '<text x="64" y="' + (330 + i * 70) + '" font-family="Oswald" font-weight="600" font-size="64" fill="' + C.o + '">' + x(t) + '</text>').join('')
    : '<text x="64" y="470" font-family="Oswald" font-weight="600" font-size="200" fill="' + tone + '">' + x(num) + '</text>'
      + '<text x="' + (74 + num.length * 92) + '" y="470" font-family="Oswald" font-weight="600" font-size="56" fill="' + C.n + '">' + x(of) + '</text>';
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="627" viewBox="0 0 1200 627">'
    + '<rect width="1200" height="627" fill="' + C.cream + '"/>' + logoTag()
    + title.map((t, i) => '<text x="64" y="' + (176 + i * 50) + '" font-family="Oswald" font-weight="600" font-size="44" fill="' + C.n + '">' + x(t) + '</text>').join('')
    + big
    + '<line x1="520" y1="300" x2="520" y2="520" stroke="' + C.line + '" stroke-width="3"/>'
    + lines.map((t, i) => '<text x="556" y="' + (338 + i * 52) + '" font-family="Lato" font-size="36" fill="' + C.ink + '">' + x(t) + '</text>').join('')
    + '<rect y="611" width="1200" height="16" fill="' + C.o + '"/></svg>';
  return s;
}
function genericSvg() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="627" viewBox="0 0 1200 627"><rect width="1200" height="627" fill="' + C.cream + '"/>' + logoTag()
    + '<text x="64" y="330" font-family="Oswald" font-weight="600" font-size="68" fill="' + C.n + '">Your brand in ChatGPT and Gemini</text>'
    + '<text x="64" y="400" font-family="Lato" font-size="36" fill="' + C.mut + '">What the assistants told shoppers, word for word.</text>'
    + '<rect y="611" width="1200" height="16" fill="' + C.o + '"/></svg>';
}
export function render(svg) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Lato' } });
  return r.render().asPng();
}
export function cardOf(html) {
  const m = /<meta name="swishdm:card" content="([^"]*)">/.exec(html); if (!m) return null;
  const c = JSON.parse(unesc(m[1]));
  if (!c || typeof c.brand !== 'string' || typeof c.line !== 'string' || !Number.isInteger(c.n) || !Number.isInteger(c.of)) throw new Error('bad card tag');
  return c;
}
function main(argv) {
  if (argv[0] === '--generic') { fs.writeFileSync(argv[1], render(genericSvg())); console.log('generic card written', argv[1]); return; }
  const root = argv[0] || 'site/compare'; let drawn = 0, generic = 0, skipped = 0;
  let dirs = []; try { dirs = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch (e) { console.log('cards: no folder ' + root); return; }
  for (const d of dirs.sort()) {
    const f = path.join(root, d, 'index.html'), out = path.join(root, d, 'card.png');
    let html; try { html = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    if (!/<meta name="swishdm:card"/.test(html)) { skipped++; continue; }
    try { const c = cardOf(html); fs.writeFileSync(out, render(svgFor(c))); drawn++; }
    catch (e) { try { fs.copyFileSync(GENERIC, out); generic++; console.log('cards: generic for ' + d + ' (' + String(e.message || e).slice(0, 80) + ')'); } catch (e2) { console.log('cards: no card for ' + d); } }
  }
  console.log('cards: ' + drawn + ' drawn, ' + generic + ' generic, ' + skipped + ' skipped');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { main(process.argv.slice(2)); } catch (e) { console.log('cards: ' + (e && e.message)); } process.exit(0); }
