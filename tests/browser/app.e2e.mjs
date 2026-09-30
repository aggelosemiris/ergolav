// Έλεγχος της εφαρμογής στον browser (ενεργή CSP): τιμές, key, κάλυψη, ΦΠΑ, PDF, μοντέλο Claude, τρίτοι.
// Εκτέλεση: npm start &  και  PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/app.e2e.mjs
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PHOTO = fs.realpathSync(new URL('../stress/fixtures/01-normal.jpg', import.meta.url));
const b = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
const ctx = await b.newContext({viewport:{width:400,height:860}, acceptDownloads: true});
const p = await ctx.newPage();
const errs = [], csp = [], external = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if(/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text().slice(0, 160)); });
p.on('request', r => { const u = new URL(r.url()); if(!/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) external.push(u.hostname); });
let gemBody = null, claudeBody = null;
await p.route('https://generativelanguage.googleapis.com/**', async r => {
  gemBody = JSON.parse(r.request().postData());
  await r.fulfill({headers:{'access-control-allow-origin':'*'}, contentType:'application/json',
    body: JSON.stringify({candidates:[{finishReason:'STOP', content:{parts:[{text:'2 τεμάχια κλιματιστικά\n999 λεκάνες κρεμαστές\nλεκάνη κρεμαστή'}]}}]})});
});
await p.route('https://api.anthropic.com/**', async r => {
  claudeBody = JSON.parse(r.request().postData());
  await r.fulfill({headers:{'access-control-allow-origin':'*', 'request-id':'x'}, contentType:'application/json',
    body: JSON.stringify({id:'m', type:'message', role:'assistant', model: claudeBody.model, stop_reason:'end_turn', content:[{type:'text', text:'12 μέτρα σωλήνας'}], usage:{input_tokens:1, output_tokens:1}})});
});
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const results = [];
const ok = (name, cond, detail='') => { results.push({name, pass: !!cond}); console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

await p.goto('http://localhost:8080/');
await p.evaluate(() => localStorage.clear()); await p.reload();

// #1 key: κρυφό, εμφάνιση, όχι αποθήκευση εξ ορισμού
await p.click('#photo');
ok('#1 πεδίο key κρυφό (password)', await p.getAttribute('#keyInput', 'type') === 'password');
await p.fill('#keyInput', 'AIza' + 'B'.repeat(35));
await p.click('#keyShow');
ok('#1 κουμπί εμφάνισης', await p.getAttribute('#keyInput', 'type') === 'text');
ok('#1 «θυμήσου» εξ ορισμού ΟΧΙ', !(await p.isChecked('#keyRemember')));
ok('#2 κείμενο: Anthropic όχι δωρεάν', /Όχι δωρεάν/.test(await p.textContent('#keySheet')));
const [ch] = await Promise.all([p.waitForEvent('filechooser'), p.click('#keySave')]);
ok('#1 key ΔΕΝ γράφτηκε στο localStorage', await p.evaluate(() => Object.keys(localStorage).filter(k => /key/i.test(k)).length === 0));

// #3 οθόνη «Πριν σταλεί» με κάλυψη
await ch.setFiles(PHOTO);
await p.waitForSelector('#s-redact.on');
ok('#3 οθόνη «Πριν σταλεί» πριν από την αποστολή', gemBody === null, 'καμία κλήση ακόμα');
ok('#3 σημείωση απορρήτου για Google', /Google.*δωρεάν.*άνθρωποι/s.test(await p.textContent('#privacyNote')));
const box = await p.locator('#redactCanvas').boundingBox();
await p.mouse.move(box.x + 20, box.y + 20); await p.mouse.down(); await p.mouse.move(box.x + box.width - 20, box.y + 120, {steps: 5}); await p.mouse.up();
// Δείγμα στη μέση της συρμένης περιοχής (CSS y = 70), μετατρεμμένο σε pixels του canvas.
const black = await p.evaluate(cssY => { const c = document.getElementById('redactCanvas'); const y = Math.floor(cssY * c.height / c.getBoundingClientRect().height); const d = c.getContext('2d').getImageData(Math.floor(c.width / 2), y, 1, 1).data; return d[0] + d[1] + d[2]; }, 70);
ok('#3 η κάλυψη ζωγραφίζεται πάνω στην εικόνα', black === 0);
await p.click('#ctaBtn');
await p.waitForSelector('#s-lines.on');
ok('#3 στάλθηκε η καλυμμένη εικόνα', !!gemBody && gemBody.contents[0].parts[0].inline_data.data.length > 1000);

// #0 τιμές: «1.234,50» σωστά, «1.234» απορρίπτεται
const unk = p.locator('.ln:has([data-a="add"])').first();
await unk.locator('[data-p="mat"]').fill('1.234');
ok('#0 «1.234» → μήνυμα ασάφειας', /ασαφές/.test(await unk.locator('[data-o="mat"]').textContent()));
await unk.locator('[data-a="add"]').click();
ok('#0 «1.234» ΔΕΝ προστέθηκε', await p.locator('.ln:has([data-a="add"])').count() === 1);
await unk.locator('[data-p="mat"]').fill('1.234,50');
ok('#0 «1.234,50» → προεπισκόπηση', (await unk.locator('[data-o="mat"]').textContent()).includes('1.234,50 €'));
await unk.locator('[data-a="add"]').click();
// ποσότητα 1000 (999 + 1): πριν γινόταν 1
const qc = p.locator('.ln:has([data-p="qty"])').first();
const pre = await qc.locator('[data-p="qty"]').inputValue();
ok('#0 ποσότητα 1000 προσυμπληρώνεται χωρίς «1.000»', pre === '1000', pre);
await qc.locator('[data-a="ok"]').click();
const names = await p.$$eval('.ln', els => els.map(e => e.querySelector('.ln-name').textContent + ' | ' + e.querySelector('.ln-sum')?.textContent));
ok('#0 γραμμές', true, names.join(' · '));
const totals = (await p.textContent('#totals')).replace(/\s+/g, ' ');
ok('#0 υλικά = 2×1.234,50 + 1000×185 = 187.469,00 €', totals.includes('187.469,00'), totals.slice(0, 80));

// #7 η εργασία κάθε γραμμής την κρίνει ο τεχνίτης
const labIn = p.locator('.ln:has([data-d]) [data-p="lab"]').first();
const row = p.locator('.ln:has([data-d])').first();
ok('#7 προσυμπληρωμένο από τον κατάλογο (σύνολο γραμμής)', await labIn.inputValue() === '90000', await labIn.inputValue());
await labIn.fill('1.500');
ok('#7 «1.500» στην εργασία → μήνυμα ασάφειας', /ασαφές/.test(await row.locator('[data-o="lab"]').textContent()));
ok('#7 με άκυρη εργασία το κουμπί μπλοκάρει', await p.locator('#ctaBtn').isDisabled());
await labIn.fill('300,50');
ok('#7 «300,50» → προεπισκόπηση', (await row.locator('[data-o="lab"]').textContent()).includes('300,50 €'));
ok('#7 το κουμπί ξεμπλοκάρει', await p.locator('#ctaBtn').isEnabled());
ok('#7 το σύνολο γραμμής = υλικό 185.000 + εργασία 300,50', (await row.locator('.ln-sum').textContent()).includes('185.300,50'), await row.locator('.ln-sum').textContent());
ok('#7 τα σύνολα ενημερώνονται (Εργασία 300,50)', (await p.textContent('#totals')).includes('300,50'));

// #4 ΦΠΑ
await p.selectOption('#vatRate', '17');
const t17 = (await p.textContent('#totals')).replace(/\s+/g, ' ');
ok('#4 ΦΠΑ 17%', /ΦΠΑ 17%/.test(t17), t17.match(/ΦΠΑ 17%[^Σ]*/)?.[0]);
await p.click('#ctaBtn');
await p.waitForSelector('#s-pdf.on');
ok('#4 ΦΠΑ 17% και στο PDF', /ΦΠΑ 17%/.test(await p.textContent('#pdf')));
// Εργασία δίπλα σε κάθε γραμμή του PDF: υλικό + εργασία = σύνολο γραμμής, και το άθροισμα της στήλης = «Εργασία» στα σύνολα.
const eurN = t => t.trim() === '—' ? 0 : Number(t.replace(/[^\d,]/g, '').replace(',', '.'));
const rows = await p.$$eval('#pdf table tr:not(:has(th))', trs => trs.map(tr => [...tr.children].map(td => td.textContent)));
ok('#6 το PDF έχει στήλη Εργασία δίπλα σε κάθε γραμμή', rows.length > 0 && rows.every(r => r.length === 4), `${rows.length} γραμμές`);
ok('#6 κάθε γραμμή: υλικό + εργασία = σύνολο', rows.every(r => Math.abs(eurN(r[1]) + eurN(r[2]) - eurN(r[3])) < 0.005), JSON.stringify(rows.slice(0, 3)));
const labSum = rows.reduce((a, r) => a + eurN(r[2]), 0);
const labTotal = eurN(await p.$eval('#pdf .sum div:nth-child(2) span:last-child', e => e.textContent));
ok('#6 άθροισμα στήλης Εργασία = σύνολο Εργασίας', Math.abs(labSum - labTotal) < 0.005, `${labSum} vs ${labTotal}`);
ok('#6 γραμμή χωρίς εργασία δείχνει «—»', rows.some(r => r[2].trim() === '—'), JSON.stringify(rows.map(r => r[2])));
if(process.env.SHOT_DIR) await p.locator('#pdf').screenshot({path: process.env.SHOT_DIR + '/pdf.png'});
await p.waitForFunction(() => document.getElementById('ctaBtn').textContent === 'Στείλε στον πελάτη', null, {timeout: 30000}).catch(() => {});
ok('#5 PDF φτιάχνεται με ενεργή CSP', await p.textContent('#ctaBtn') === 'Στείλε στον πελάτη', await p.textContent('#ctaBtn'));

// #1 «θυμήσου» + «ξέχασε»
await p.goto('http://localhost:8080/');
await p.click('#photo');
await p.fill('#keyInput', 'sk-ant-' + 'x'.repeat(40));
await p.check('#keyRemember');
const [ch2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#keySave')]);
ok('#1 με «θυμήσου» αποθηκεύεται', await p.evaluate(() => !!localStorage.getItem('ergolav.apiKey')));
// #2 Claude: μοντέλο + SDK τοπικά
await ch2.setFiles(PHOTO);
await p.waitForSelector('#s-redact.on');
ok('#3 σημείωση απορρήτου για Anthropic', /Anthropic/.test(await p.textContent('#privacyNote')));
await p.click('#ctaBtn');
await p.waitForSelector('#s-lines.on', {timeout: 20000}).catch(() => {});
ok('#2 Claude μοντέλο claude-sonnet-5-5', claudeBody?.model === 'claude-sonnet-5-5', claudeBody?.model);
ok('#2 fallbacks/effort στο αίτημα', claudeBody?.fallbacks === 'default' && claudeBody?.output_config?.effort === 'low');
await p.goto('http://localhost:8080/');
ok('#1 σύνδεσμος «Κλειδί ανάγνωσης» στην αρχική', await p.isVisible('#keySettings'));
await p.click('#keySettings');
ok('#1 «Ξέχασε το key» εμφανίζεται', await p.isVisible('#keyForget'));
await p.click('#keyForget');
ok('#1 «Ξέχασε» σβήνει το key', await p.evaluate(() => !localStorage.getItem('ergolav.apiKey')));
ok('#1 μετά το «Ξέχασε» ζητάει ξανά key', (await p.click('#photo'), await p.isVisible('#keySheet.on')));
await p.goto('http://localhost:8080/');
ok('#1 μετά από reload δεν υπάρχει key', !(await p.isVisible('#keySettings')));

ok('#5 κανένα script/αίτημα σε τρίτο domain εκτός API', external.every(h => /generativelanguage|api\.anthropic|fonts\.g/.test(h)), [...new Set(external)].join(', '));
ok('#5 καμία παραβίαση CSP', csp.length === 0, csp.join(' | '));
ok('καμία JS εξαίρεση', errs.length === 0, errs.join(' | '));
await b.close();
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? ' — απέτυχαν: ' + failed.map(r => r.name).join(' | ') : ''}`);
process.exit(failed.length ? 1 : 0);
