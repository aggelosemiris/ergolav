# Stress test — ergolav

Επαναλήψιμο stress/adversarial test για την ανάγνωση σημειώσεων (LLM provider) και την αντιστοίχιση
κειμένου σε υλικά καταλόγου. **Δεν αλλάζει τίποτα στην εφαρμογή**: εισάγει τα `src/*.js` όπως είναι και
αντικαθιστά μόνο το `fetch` και το `setTimeout` μέσα στο process του test. Χωρίς νέα dependencies (Node ≥ 22).

## Εκτέλεση

```sh
npm run test:stress                 # mock provider — καμία δικτυακή κλήση, ~1 λεπτό
npm run test:stress:live            # πραγματικό Gemini (χρειάζεται GEMINI_API_KEY) — βλ. παρακάτω
STRICT=1 npm run test:stress        # exit code 1 αν αποτύχει κάποιο test (για CI)
```

Αποτελέσματα: `tests/stress/LAST_REPORT.md` (τελευταίο mock run) και `tests/stress/reports/<χρόνος>/`
(`report.md`, `results.jsonl` με μία γραμμή ανά test, `summary.json`). Τα keys δεν γράφονται ποτέ στα logs.

## Τι ελέγχεται

| Suite | Αρχείο | Τι μετράει | Δίκτυο |
|---|---|---|---|
| Parser / κατάλογος | `suites/catalog.mjs`, `cases/catalog.cases.mjs` | Το «retrieval» του ergolav: σωστό υλικό & ποσότητα σε normal, noise, similar-but-wrong, conflict/διόρθωση, missing, partial, multi, duplicate, variation (ορθογραφία, συνώνυμα, greeklish, αγγλικά), έξοδος LLM (τιμές, markdown, εισαγωγές), μεγάλη είσοδος | όχι |
| Provider failures | `suites/provider-failures.mjs` | 20 σενάρια: 429 (+Retry-After), 500, 502, 503, network, timeout/hang, αργή απάντηση, HTML αντί JSON, κενό, malformed, MAX_TOKENS, SAFETY, άκυρο key, 404, injected «ΚΑΜΙΑ ΣΗΜΕΙΩΣΗ». Ελέγχει retry, backoff, Retry-After, όριο retries, timeout, μήνυμα στον χρήστη | όχι (mock) |
| Load | `suites/provider-load.mjs` | Βαθμίδες concurrency με δύο προφίλ provider: `quota` (όριο αιτημάτων/λεπτό ανά μοντέλο) και `overload` (πολλά 503). Latency avg/p50/p95/p99/min/max, throughput, 429/5xx, retries, πολλαπλασιασμός κλήσεων, tokens, κόστος | όχι (mock) ή ναι (live) |
| Live quality | `suites/live.mjs`, `cases/live.cases.mjs`, `fixtures/` | 10 φωτογραφίες: normal, noise, τιμολόγιο, **prompt injection μέσα στη φωτογραφία**, κενή, διαγραμμένα/διορθώσεις, ελλιπή, μεγάλη λίστα, διπλότυπα, αγγλικά. Ντετερμινιστικοί έλεγχοι (αναμενόμενα/απαγορευμένα υλικά, απαγορευμένο κείμενο, διαρροή prompt) — όχι LLM-as-judge | ναι |

## Ρυθμίσεις (μεταβλητές περιβάλλοντος)

| Μεταβλητή | Mock default | Live default | Σημασία |
|---|---|---|---|
| `REQUEST_COUNT` | 50 | 3 | αιτήματα ανά βαθμίδα |
| `CONCURRENCY` | `1,5,10,25,50` | `1,2` | βαθμίδες (live: >10 μόνο με `ALLOW_HIGH_CONCURRENCY=1`) |
| `REQUESTS_PER_SECOND` | 0 (χωρίς όριο) | 0.5 | ρυθμός εκκίνησης |
| `TIMEOUT` | 60000 | 60000 | όριο του harness ανά πάτημα σε ms (η εφαρμογή δεν έχει δικό της) |
| `MAX_RETRIES` | 0 | 0 | επαναλήψεις ολόκληρου του `readNotes` από το harness (0 = μετράμε την εφαρμογή όπως είναι· τα δικά της retries είναι σταθερά στον κώδικα) |
| `TEST_DURATION` | 0 (χωρίς όριο) | 120000 | μετά από τόσα ms δεν ξεκινούν νέα αιτήματα |
| `MOCK_RPM` / `MOCK_LATENCY_MS` / `MOCK_ERROR_RATE` / `MOCK_OVERLOAD_ERROR_RATE` | 10 / 1800 / 0.02 / 0.6 | — | συμπεριφορά του ψεύτικου provider (υποθέσεις — άλλαξέ τες για τα δικά σου όρια) |
| `SCALE` | 0.01 | — | επιτάχυνση χρόνου στο mock (οι χρόνοι αναφέρονται σε «πραγματικά» ms, ±5%) |
| `LIVE_MAX_CALLS` | — | 40 | σκληρό όριο HTTP κλήσεων προς τον provider για όλο το run |
| `LIVE_REPEAT` | — | 1 | επαναλήψεις κάθε φωτογραφίας (σταθερότητα) |
| `LIVE_LOAD=1` | — | off | ενεργοποιεί και live load test (μετά το quality) |
| `PRICE_IN_PER_M` / `PRICE_OUT_PER_M` | — | — | τιμή ανά 1M tokens για εκτίμηση κόστους (αλλιώς δεν υπολογίζεται) |

Παράδειγμα live:

```sh
GEMINI_API_KEY=… LIVE_REPEAT=2 npm run test:stress:live
GEMINI_API_KEY=… LIVE_LOAD=1 CONCURRENCY=1,2,5 REQUEST_COUNT=5 npm run test:stress:live
```

## Όρια

- Η διαδρομή **Claude** δεν ελέγχεται: φορτώνει το SDK από CDN στον browser, κάτι που δεν τρέχει σε Node.
- Η σμίκρυνση φωτογραφίας (`shrink`), η φωνή (`mic.js`) και το PDF (`share.js`) θέλουν browser· δεν είναι μέρος αυτού του suite.
- Στο mock, τα tokens είναι σταθερά ενδεικτικά νούμερα· πραγματικά tokens/κόστος μόνο σε live.
- Τα 503 στο προφίλ `overload` είναι ανεξάρτητα ανά κλήση· στην πράξη μια υπερφόρτωση κρατάει λεπτά και
  καλύπτεται από το σενάριο `fail-03-503-always` (όλες οι κλήσεις αποτυγχάνουν).
