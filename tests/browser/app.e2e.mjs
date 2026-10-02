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

// Στην προσφορά μπαίνουν ΜΟΝΟ υλικά του καταλόγου: το «κλιματιστικά» δεν υπάρχει στον κατάλογο
const unk = p.locator('.ln.skip:has-text("Κλιματιστικά")');
ok('#C είδος εκτός καταλόγου: «δεν μπαίνει στην προσφορά»', /δεν μπαίνει στην προσφορά/.test(await unk.textContent()));
ok('#C χωρίς πεδία τιμής και χωρίς κουμπί «Πρόσθεσέ το»', await unk.locator('input, [data-a="add"]').count() === 0);
ok('#C δεν μπλοκάρει: μένει μόνο η ποσότητα 999 να επιβεβαιωθεί', /1 γραμμή/.test(await p.textContent('#ctaNote')), await p.textContent('#ctaNote'));
const qc = p.locator('.ln:has([data-p="qty"])').first();
const pre = await qc.locator('[data-p="qty"]').inputValue();
ok('#0 ποσότητα 1000 προσυμπληρώνεται χωρίς «1.000»', pre === '1000', pre);
await qc.locator('[data-a="ok"]').click();
ok('#C με το είδος εκτός καταλόγου στη λίστα, το κουμπί ξεκλειδώνει', await p.locator('#ctaBtn').isEnabled());
const totals = (await p.textContent('#totals')).replace(/\s+/g, ' ');
ok('#C στα σύνολα μπαίνει μόνο ο κατάλογος: υλικά = 1000 × 185 = 185.000,00 €', /Υλικά\s*185\.000,00 €/.test(totals), totals.slice(0, 80));

// ── Α. Τιμές υλικού: τρεις προτάσεις + «Άλλη τιμή» με μνήμη ──
const lek = p.locator('.ln:has(.tiers):has-text("Λεκάνη")').first();
const lekSum = async () => (await lek.locator('.ln-sum').textContent()).trim();
const tierTxt = async t => (await lek.locator(`.tier[data-t="${t}"]`).textContent()).replace(/\s+/g, ' ');
ok('#A οι τρεις προτάσεις + Άλλη τιμή (κανονική = κατάλογος 185,00 €, οικονομική 111,00 €, ακριβή 351,50 €)',
  (await tierTxt('normal')).includes('185,00') && (await tierTxt('eco')).includes('111,00') && (await tierTxt('premium')).includes('351,50') && await lek.locator('.tier[data-t="custom"]').count() === 1,
  [await tierTxt('eco'), await tierTxt('normal'), await tierTxt('premium')].join(' | '));
ok('#A προεπιλογή: κανονική, η προσφορά βγαίνει όπως πριν (185.000,00 €)', await lek.locator('.tier[data-t="normal"]').getAttribute('aria-pressed') === 'true' && (await lekSum()).includes('185.000,00'), await lekSum());
ok('#A χωρίς «Άλλη τιμή» δεν υπάρχει πεδίο ούτε λίστα', await lek.locator('[data-p="cmat"], .hist').count() === 0);
ok('#A είδος εκτός καταλόγου / μόνο εργασίας: καμία επιλογή τιμής', await p.locator('.ln:has-text("Κλιματιστικά") .tier').count() === 0);
await lek.locator('.tier[data-t="eco"]').click();
ok('#A οικονομική → υλικό 111,00 €/τεμ. (111.000,00 €)', (await lekSum()).includes('111.000,00'), await lekSum());
ok('#A οι προτάσεις δεν μετακινούνται όταν αλλάζει η επιλογή', (await tierTxt('normal')).includes('185,00') && (await tierTxt('premium')).includes('351,50'));
await lek.locator('.tier[data-t="premium"]').click();
ok('#A ακριβή → 351,50 €/τεμ. (351.500,00 €)', (await lekSum()).includes('351.500,00'), await lekSum());
await lek.locator('.tier[data-t="normal"]').click();
// Άλλη τιμή: πρώτη φορά, δεν υπάρχει ιστορικό
await lek.locator('.tier[data-t="custom"]').click();
ok('#A «Άλλη τιμή» ανοίγει πεδίο', await lek.locator('[data-p="cmat"]').isVisible());
ok('#A όσο είναι ανοιχτό το πεδίο το κουμπί κλειδώνει', await p.locator('#ctaBtn').isDisabled());
ok('#A χωρίς ιστορικό δεν εμφανίζεται λίστα', !(await lek.locator('.hist').isVisible()));
await lek.locator('[data-p="cmat"]').fill('1.500');
ok('#A «1.500» → μήνυμα ασάφειας (αυστηρή ανάγνωση)', /ασαφές/.test(await lek.locator('[data-o="cmat"]').textContent()));
await lek.locator('[data-a="keep"]').click();
ok('#A με ασαφή τιμή δεν εφαρμόζεται τίποτα', (await lekSum()).includes('185.000,00') && await lek.locator('[data-p="cmat"]').isVisible());
await lek.locator('[data-p="cmat"]').fill('195');
ok('#A «195» → προεπισκόπηση', (await lek.locator('[data-o="cmat"]').textContent()).includes('195,00 €'));
await lek.locator('[data-a="keep"]').click();
ok('#A «Κράτα την» εφαρμόζει 195 € (195.000,00 €) και ξεκλειδώνει', (await lekSum()).includes('195.000,00') && await p.locator('#ctaBtn').isEnabled(), await lekSum());
const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('ergolav.prices') || '{}'));
ok('#A η τιμή θυμήθηκε ανά είδος+τύπο, με ημερομηνία', Object.entries(stored).some(([k, v]) => /^wc\|/.test(k) && v[0].c === 19500 && Math.abs(v[0].at - Date.now()) < 60000), JSON.stringify(stored).slice(0, 120));
// δεύτερη τιμή + «παλιά» τιμή (200 ημέρες) για τον ίδιο τύπο
const key = Object.keys(stored).find(k => /^wc\|/.test(k));
await p.evaluate(([k]) => { const d = JSON.parse(localStorage.getItem('ergolav.prices')); d[k].push({c: 17800, at: Date.now() - 200 * 86400000}); localStorage.setItem('ergolav.prices', JSON.stringify(d)); }, [key]);
await lek.locator('.tier[data-t="custom"]').click();
ok('#A οι αποθηκευμένες τιμές φαίνονται μόνο όταν πατηθεί «Άλλη τιμή»', await lek.locator('.hist').isVisible());
const hist = (await lek.locator('.hi').allTextContents()).map(t => t.replace(/\s+/g, ' '));
ok('#A νεότερη πρώτη, με ημερομηνία: «195,00 € σήμερα», μετά «178,00 €»', hist.length === 2 && /195,00 €\s*σήμερα/.test(hist[0]) && /178,00 €/.test(hist[1]), hist.join(' | '));
ok('#A τιμή πάνω από 6 μήνες: «έλεγξε αν άλλαξε»', /έλεγξε αν άλλαξε/.test(hist[1]) && !/έλεγξε/.test(hist[0]), hist.join(' | '));
ok('#A ΔΕΝ μπαίνει αυτόματα από το ιστορικό (το πεδίο είναι άδειο)', await lek.locator('[data-p="cmat"]').inputValue() === '');
await lek.locator('[data-p="cmat"]').pressSequentially('1');
ok('#A στην πρώτη πληκτρολόγηση η λίστα κρύβεται', !(await lek.locator('.hist').isVisible()));
await lek.locator('[data-p="cmat"]').fill('');
ok('#A αν αδειάσει το πεδίο, η λίστα ξαναφαίνεται', await lek.locator('.hist').isVisible());
await lek.locator('.hi').nth(1).click();
ok('#A πάτημα σε τιμή γεμίζει το πεδίο (δεν την εφαρμόζει)', await lek.locator('[data-p="cmat"]').inputValue() === '178' && (await lekSum()).includes('195.000,00'));
await lek.locator('[data-a="cancel"]').click();
ok('#A «Άκυρο» κλείνει χωρίς αλλαγή και ξεκλειδώνει', (await lekSum()).includes('195.000,00') && await p.locator('#ctaBtn').isEnabled());
await lek.locator('.tier[data-t="normal"]').click();   // πίσω στην κανονική για τα υπόλοιπα

// ── Β. Εργασία: ένα πεδίο για όλη τη δουλειά ──
const labIn = p.locator('#laborBox [data-p="labor"]');
ok('#B καμία κάρτα δεν έχει πεδίο εργασίας', await p.locator('#lines [data-p="lab"]').count() === 0);
ok('#B ένα πεδίο, προσυμπληρωμένο με την πρόταση του καταλόγου (1000 × 90 € = 90000)', await p.locator('#laborBox [data-p="labor"]').count() === 1 && await labIn.inputValue() === '90000', await labIn.inputValue());
await labIn.fill('1.500');
ok('#B «1.500» → μήνυμα ασάφειας', /ασαφές/.test(await p.locator('#laborBox [data-o="labor"]').textContent()));
ok('#B άκυρη εργασία → το κουμπί κλειδώνει με σαφές μήνυμα', await p.locator('#ctaBtn').isDisabled() && /εργασία/.test(await p.textContent('#ctaNote')), await p.textContent('#ctaNote'));
await labIn.fill('300,50');
ok('#B «300,50» → προεπισκόπηση και ξεκλειδώνει', (await p.locator('#laborBox [data-o="labor"]').textContent()).includes('300,50 €') && await p.locator('#ctaBtn').isEnabled());
const tot = (await p.textContent('#totals')).replace(/\s+/g, ' ');
ok('#B τα σύνολα ενημερώνονται (Εργασία 300,50 €)', /Εργασία\s*300,50 €/.test(tot), tot.slice(0, 90));
ok('#B μετά το δικό του νούμερο φαίνεται η πρόταση για σύγκριση', /Πρόταση καταλόγου: 90\.000,00 €/.test(await p.textContent('#laborBox')));
await p.locator('.ln:has-text("Λεκάνη") [data-d="1"]').click();
ok('#B ό,τι έγραψε μένει όταν αλλάξουν ποσότητες (η πρόταση ακολουθεί: 90.090,00 €)', await labIn.inputValue() === '300,50' && /Πρόταση καταλόγου: 90\.090,00 €/.test(await p.textContent('#laborBox')), await labIn.inputValue());
await p.locator('#laborBox [data-a="auto"]').click();
ok('#B «Χρησιμοποίησέ την» επιστρέφει στην αυτόματη πρόταση (90090)', await labIn.inputValue() === '90090');
await labIn.fill('0');
ok('#B το 0 επιτρέπεται (χωρίς εργασία)', await p.locator('#ctaBtn').isEnabled() && /Εργασία\s*0,00 €/.test(await p.textContent('#totals')));
await labIn.fill('300,50');

// #4 ΦΠΑ
await p.selectOption('#vatRate', '17');
const t17 = (await p.textContent('#totals')).replace(/\s+/g, ' ');
ok('#4 ΦΠΑ 17%', /ΦΠΑ 17%/.test(t17), t17.match(/ΦΠΑ 17%[^Σ]*/)?.[0]);
await p.click('#ctaBtn');
await p.waitForSelector('#s-pdf.on');
ok('#4 ΦΠΑ 17% και στο PDF', /ΦΠΑ 17%/.test(await p.textContent('#pdf')));
// PDF: υλικά ανά γραμμή, η εργασία ΜΙΑ φορά στα σύνολα.
const eurN = t => Number(t.replace(/[^\d,]/g, '').replace(',', '.'));
const rows = await p.$$eval('#pdf table tr:not(:has(th))', trs => trs.map(tr => [...tr.children].map(td => td.textContent)));
const sumRow = async name => eurN(await p.$eval('#pdf .sum', (e, n) => [...e.children].find(d => d.firstChild.textContent.startsWith(n))?.lastChild.textContent ?? '0', name));
ok('#B PDF: στήλες μόνο Περιγραφή + Υλικό (η εργασία δεν είναι στήλη)', rows.length > 0 && rows.every(r => r.length === 2) && (await p.$$eval('#pdf th', t => t.map(x => x.textContent))).join() === 'Περιγραφή,Υλικό');
const matLines = rows.reduce((a, r) => a + eurN(r[1]), 0);
ok('#B PDF: άθροισμα υλικών γραμμών = «Υλικά»', Math.abs(matLines - await sumRow('Υλικά')) < 0.005, `${matLines} vs ${await sumRow('Υλικά')}`);
ok('#B PDF: η εργασία εμφανίζεται μία φορά, 300,50 €', (await p.textContent('#pdf')).match(/Εργασία/g).length === 1 && await sumRow('Εργασία') === 300.5);
ok('#B PDF: υλικά + εργασία = καθαρή αξία', Math.abs(await sumRow('Υλικά') + await sumRow('Εργασία') - await sumRow('Καθαρή')) < 0.005);
ok('#C το είδος εκτός καταλόγου ΔΕΝ υπάρχει στο PDF', !/Κλιματιστικ/.test(await p.textContent('#pdf')));
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

// ── Β. γραμμή μόνο εργασίας + νέα ανάλυση μηδενίζει την εργασία ──
await p.goto('http://localhost:8080/');
await p.click('#mic');
await p.evaluate(() => { const t = document.getElementById('transcript'); t.textContent = 'αποξήλωση παλιών ειδών και δύο μπαταρίες νιπτήρα'; t.dispatchEvent(new Event('input', {bubbles: true})); });
await p.click('#ctaBtn');
await p.waitForSelector('#s-lines.on');
const dem = p.locator('.ln:has-text("Αποξήλωση")');
ok('#B γραμμή μόνο εργασίας: «στην εργασία», χωρίς επιλογή τιμής', (await dem.locator('.ln-sum').textContent()).includes('στην εργασία') && await dem.locator('.tier').count() === 0);
ok('#B η πρόταση περιέχει την εργασία της αποξήλωσης (250 + 2 × 35 = 320)', await p.locator('#laborBox [data-p="labor"]').inputValue() === '320', await p.locator('#laborBox [data-p="labor"]').inputValue());
await p.click('#ctaBtn');
await p.waitForSelector('#s-pdf.on');
const rows2 = await p.$$eval('#pdf table tr:not(:has(th))', trs => trs.map(tr => [...tr.children].map(td => td.textContent)));
ok('#B PDF: γραμμή μόνο εργασίας γράφει «στην εργασία»', rows2.some(r => /Αποξήλωση/.test(r[0]) && r[1].trim() === 'στην εργασία'), JSON.stringify(rows2));
// νέα ανάλυση: η εργασία ξαναρχίζει από την πρόταση
await p.goto('http://localhost:8080/');
await p.click('#mic');
await p.evaluate(() => { const t = document.getElementById('transcript'); t.textContent = 'τρεις πρίζες'; t.dispatchEvent(new Event('input', {bubbles: true})); });
await p.click('#ctaBtn');
await p.waitForSelector('#s-lines.on');
ok('#B νέα προσφορά: η εργασία ξαναρχίζει από την πρόταση (3 × 12 = 36)', await p.locator('#laborBox [data-p="labor"]').inputValue() === '36', await p.locator('#laborBox [data-p="labor"]').inputValue());
ok('#A οι τιμές που έγραψε μένουν και στην επόμενη προσφορά (μνήμη ανά συσκευή)', await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ergolav.prices') || '{}')).length > 0));

// μόνο εκτός καταλόγου → δεν υπάρχει προσφορά
await p.goto('http://localhost:8080/');
await p.click('#mic');
await p.evaluate(() => { const t = document.getElementById('transcript'); t.textContent = 'ένα κλιματιστικό'; t.dispatchEvent(new Event('input', {bubbles: true})); });
await p.click('#ctaBtn');
await p.waitForSelector('#s-lines.on');
ok('#C αν δεν βρεθεί τίποτα από τον κατάλογο, δεν γίνεται προσφορά (κουμπί κλειδωμένο, με εξήγηση)', await p.locator('#ctaBtn').isDisabled() && /κανένα υλικό από τον κατάλογο/.test(await p.textContent('#ctaNote')), await p.textContent('#ctaNote'));

ok('#5 κανένα script/αίτημα σε τρίτο domain εκτός API', external.every(h => /generativelanguage|api\.anthropic|fonts\.g/.test(h)), [...new Set(external)].join(', '));
ok('#5 καμία παραβίαση CSP', csp.length === 0, csp.join(' | '));
ok('καμία JS εξαίρεση', errs.length === 0, errs.join(' | '));
await b.close();
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? ' — απέτυχαν: ' + failed.map(r => r.name).join(' | ') : ''}`);
process.exit(failed.length ? 1 : 0);
