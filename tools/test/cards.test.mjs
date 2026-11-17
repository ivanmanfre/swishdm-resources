// node --test tools/test/  : three pages (good card tag, broken tag, no tag) and an over-long brand and line
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const here = path.dirname(new URL(import.meta.url).pathname), script = path.join(here, '..', 'cards.mjs');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const page = (card) => '<!doctype html><html><head><meta name="robots" content="noindex, nofollow">' + (card === null ? '' : '<meta name="swishdm:card" content="' + card + '">') + '</head><body>x</body></html>';
const dims = (f) => { const b = fs.readFileSync(f); assert.equal(b.toString('latin1', 1, 4), 'PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
test('good tag gets a 1200x627 card, broken tag the generic card, no tag no card, exit 0', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cards-'));
  const put = (t, html) => { fs.mkdirSync(path.join(d, t)); fs.writeFileSync(path.join(d, t, 'index.html'), html); };
  put('aaaaaaaaaaaaaaaaaaaa', page(esc(JSON.stringify({ brand: "Quick 'n Brite", line: 'Branch Basics is named in 4 of 4 answers to “fragrance free cleaner”. Quick \'n Brite is named in 0.', n: 4, of: 4, tone: 'riv', stamp: "Quick 'n Brite was not in this answer" }))));
  put('bbbbbbbbbbbbbbbbbbbb', page('{not json'));
  put('cccccccccccccccccccc', page(null));
  put('dddddddddddddddddddd', page(esc(JSON.stringify({ brand: 'B'.repeat(60), line: 'word '.repeat(44).trim(), n: 12, of: 16, tone: 'own', stamp: '' }))));
  const out = execFileSync(process.execPath, [script, d], { encoding: 'utf8' });
  assert.deepEqual(dims(path.join(d, 'aaaaaaaaaaaaaaaaaaaa', 'card.png')), [1200, 627]);
  const generic = fs.readFileSync(path.join(here, '..', '..', 'site', 'media', 'report-card.png'));
  assert.ok(fs.readFileSync(path.join(d, 'bbbbbbbbbbbbbbbbbbbb', 'card.png')).equals(generic));
  assert.ok(!fs.existsSync(path.join(d, 'cccccccccccccccccccc', 'card.png')));
  assert.deepEqual(dims(path.join(d, 'dddddddddddddddddddd', 'card.png')), [1200, 627]);
  assert.match(out, /cards: 2 drawn, 1 generic, 1 skipped/);
});
test('line wrapping: at most 4 lines of 34 characters, cut with an ellipsis', async () => {
  const { wrap } = await import(script);
  const w = wrap('word '.repeat(44).trim(), 34, 4);
  assert.equal(w.length, 4); assert.ok(w.every(l => l.length <= 34)); assert.ok(w[3].endsWith('…'));
  assert.deepEqual(wrap('Stan\'s is named in 16 of 16 answers.', 34, 4), ["Stan's is named in 16 of 16", 'answers.']);
});
test('a brand count of 0 or 1 is never drawn large: the stamp takes its place', async () => {
  const { render } = await import(script); const mod = await import(script);
  const html = (n) => '<meta name="swishdm:card" content="' + esc(JSON.stringify({ brand: 'VB', line: 'VB is named in ' + n + ' of 12 answers to shopper searches.', n, of: 12, tone: 'own', stamp: 'VB was not in this answer' })) + '">';
  assert.equal(mod.cardOf(html(0)).n, 0);
  const svg0 = mod.svgFor(mod.cardOf(html(0))), svg5 = mod.svgFor(mod.cardOf(html(5)));
  assert.ok(!/font-size="200"/.test(svg0) && /VB WAS NOT IN/.test(svg0)); assert.ok(/font-size="200"[^>]*>5</.test(svg5));
});
