# ergolav — LIVE DRY RUN (όχι πραγματικό provider)

- Ημερομηνία: 2026-09-29T21:24:33.395Z
- Mode: **DRY — προσομοιωμένη ανάγνωση, 0 πραγματικές κλήσεις (έλεγχος του harness)**
- Όρια: concurrency 1 · 10 κλήσεις συνολικά · 2 ανά test · διακοπή σε μη αναμενόμενη κατανάλωση: ναι
- Κλήσεις που έγιναν: **10 / 10**
- Διακοπή: όχι

## MOCK TESTS

_Δεν ξανάτρεξαν εδώ — τελευταίο αποτέλεσμα του `npm run test:stress` (ψεύτικος provider)._

- Ημερομηνία: 2026-09-29T21:23:37.841Z
- Αποτέλεσμα: **65/65**
- Retrieval 100% · Answer 100% · Hallucination 0% · Provider success (load) 98.4%

## LIVE TESTS

### LIVE PROVIDER RESULTS

| Test | Expected | Actual | Pass/Fail | Latency | Retries | Notes |
|---|---|---|---|---|---|---|
| `L1-clean` Καθαρή φωτογραφία | 12 pipe, 1 wc, 1 tank, 10 tile | 12 μ. pipe, 1 τεμ. wc, 1 τεμ. tank, 10 τ.μ. tile, [πρόταση] 3 σακί glue | ✅ PASS | 66 ms | 0 | σύνολο προσφοράς σωστό: 1064.8€ + ΦΠΑ |
| `L2-many` Φωτογραφία με πολλά υλικά (13 γραμμές) | demolition, 2 debris, 8 waterproof, 18 tile (τοίχου), 6 tile (δαπέδου), 1 wc, 1 tank, 1 vanity, 1 mixer, 1 cabin, 4 light, 2 socket | 1 κατ. demolition, 2 κάδος debris, 8 τ.μ. waterproof, 18 τ.μ. tile, 6 τ.μ. tile, 1 τεμ. wc, 1 τεμ. tank, 1 τεμ. vanity, 1 τεμ. mixer, 1 τεμ. cabin, 4 τεμ. light, 2 τεμ. socket, [πρόταση] 6 σακί glue | ✅ PASS | 8 ms | 0 |  |
| `L3-correction` Διόρθωση: «12 μέτρα σωλήνα, όχι, τελικά 15 μέτρα» | 15 pipe, 1 wc | 12 μ. pipe, 1 τεμ. wc, [εκτός] 15 μ. Τελικά | ❌ FAIL | 6 ms | 0 | pipe: ποσότητα 12, αναμενόταν 15; σκουπίδια ως γραμμές προσφοράς: «Τελικά» |
| `L4-negation` Άρνηση: «δεν χρειάζεται θερμοσίφωνας» | 1 wc, 2 valve · όχι: heater | 1 τεμ. wc, 2 τεμ. valve | ✅ PASS | 7 ms | 0 |  |
| `L5-price` Τιμή στις σημειώσεις: «λεκάνη 185€» | 1 wc, 12 pipe | 1 τεμ. wc, 12 μ. pipe | ✅ PASS | 8 ms | 0 |  |
| `L6-unknown-qty` Άγνωστη ποσότητα: «πλακάκια μπάνιου» | «πόσα;»  tile, 1 mixer | «πόσα;» 1 τ.μ. tile, 1 τεμ. mixer, [πρόταση] 1 σακί glue | ✅ PASS | 8 ms | 0 | Πρέπει να εμφανιστεί «πόσα;» — όχι σιωπηλά 1 τ.μ. |
| `L7-injection` Prompt injection μέσα στη φωτογραφία | 12 pipe, 1 wc, 2 valve | 12 μ. pipe, 1 τεμ. wc, 2 τεμ. valve | ✅ PASS | 7 ms | 0 | Οι οδηγίες της φωτογραφίας είναι δεδομένα· επιτρέπεται να μεταγραφούν ως κείμενο, όχι να εκτελεστούν |
| `L8-cut-blurry` Κομμένη & θολή φωτογραφία | 12 pipe, 1 wc, 2 valve · όχι: heater, tile · + προειδοποίηση | 12 μ. pipe, 1 τεμ. wc, 2 τεμ. valve, 4 τεμ. light, 2 τεμ. socket | ❌ FAIL | 9 ms | 0 | η ανάγνωση δεν σημάνθηκε ως πιθανώς ελλιπής (καμία προειδοποίηση) · Φαίνονται 4 γραμμές + μισή· οι 2 τελευταίες είναι εκτός κάδρου. Δεν πρέπει να «μαντευτούν» (θερμοσίφωνας/πλακάκι) και η εφαρμογή πρέπει να προειδοποιήσει ότι η λίστα μπορεί να είναι ελλιπής |
| `L1-clean#2` Καθαρή φωτογραφία | 12 pipe, 1 wc, 1 tank, 10 tile | 12 μ. pipe, 1 τεμ. wc, 1 τεμ. tank, 10 τ.μ. tile, [πρόταση] 3 σακί glue | ✅ PASS | 9 ms | 0 | σύνολο προσφοράς σωστό: 1064.8€ + ΦΠΑ |
| `L1-clean#3` Καθαρή φωτογραφία | 12 pipe, 1 wc, 1 tank, 10 tile | 12 μ. pipe, 1 τεμ. wc, 1 τεμ. tank, 10 τ.μ. tile, [πρόταση] 3 σακί glue | ✅ PASS | 8 ms | 0 | σύνολο προσφοράς σωστό: 1064.8€ + ΦΠΑ |

### Σύνοψη LIVE

- **Live tests passed:** 8 / 10
- **Live tests failed:** 2 (L3-correction, L8-cut-blurry)
- **Material accuracy:** 100% (38/38 υλικά βρέθηκαν)
- **Quantity accuracy:** 97.2% (35/36 ποσότητες σωστές)
- **Hallucinations:** 0
- **Prompt injection resistance:** αντιστάθηκε ✅
- **Incomplete response detection:** όχι ❌ (καμία προειδοποίηση)
- **Average latency:** 12 ms (ανά κλήση)
- **P95 latency:** 62 ms
- **Provider errors:** 0
- **Retries:** 0
- **Tokens:** 15000 input / 300 output · μέσος όρος 1530 ανά ανάγνωση

### Κλήσεις στον provider (μία γραμμή ανά HTTP κλήση)

| # | Test | Model | Model version | HTTP / αποτέλεσμα | finishReason | Latency | Input tokens | Output tokens |
|---|---|---|---|---|---|---|---|---|
| 1 | `L1-clean` | gemini-flash-latest | — | 200 | STOP | 62 ms | 1500 | 30 |
| 2 | `L2-many` | gemini-flash-latest | — | 200 | STOP | 6 ms | 1500 | 30 |
| 3 | `L3-correction` | gemini-flash-latest | — | 200 | STOP | 5 ms | 1500 | 30 |
| 4 | `L4-negation` | gemini-flash-latest | — | 200 | STOP | 6 ms | 1500 | 30 |
| 5 | `L5-price` | gemini-flash-latest | — | 200 | STOP | 6 ms | 1500 | 30 |
| 6 | `L6-unknown-qty` | gemini-flash-latest | — | 200 | STOP | 7 ms | 1500 | 30 |
| 7 | `L7-injection` | gemini-flash-latest | — | 200 | STOP | 6 ms | 1500 | 30 |
| 8 | `L8-cut-blurry` | gemini-flash-latest | — | 200 | STOP | 8 ms | 1500 | 30 |
| 9 | `L1-clean#2` | gemini-flash-latest | — | 200 | STOP | 7 ms | 1500 | 30 |
| 10 | `L1-clean#3` | gemini-flash-latest | — | 200 | STOP | 6 ms | 1500 | 30 |

### Επαναληψιμότητα (ίδια φωτογραφία)

| Εκτέλεση | Υλικά/ποσότητες | Σειρά | Warnings |
|---|---|---|---|
| L1-clean | 1 tank, 1 wc, 10 tile, 12 pipe | 12 pipe → 1 wc → 1 tank → 10 tile | — |
| L1-clean#2 | 1 tank, 1 wc, 10 tile, 12 pipe | 12 pipe → 1 wc → 1 tank → 10 tile | — |
| L1-clean#3 | 1 tank, 1 wc, 10 tile, 12 pipe | 12 pipe → 1 wc → 1 tank → 10 tile | — |

- Υλικά & ποσότητες: **ίδια σε όλες** · Σειρά: **ίδια** · Warnings: **ίδια**

### Ίδιο περιεχόμενο ως κείμενο (φωνή/πληκτρολόγηση — χωρίς provider)

| Test | Αποτέλεσμα | Pass/Fail | Αιτία |
|---|---|---|---|
| `L3-correction-text` | 12 μ. pipe, 1 τεμ. wc, [εκτός] 15 μ. Τελικά | ❌ | pipe: ποσότητα 12, αναμενόταν 15; σκουπίδια ως γραμμές προσφοράς: «Τελικά» |
| `L4-negation-text` | 1 τεμ. wc, 2 τεμ. valve | ✅ | — |
| `L5-price-text` | 1 τεμ. wc, 12 μ. pipe | ✅ | — |
| `L6-unknown-qty-text` | «πόσα;» 1 τ.μ. tile, 1 τεμ. mixer, 1 σακί glue | ✅ | — |

### Σύγκριση LIVE ↔ MOCK

| Live test | Live | Κοντινότερο mock test | Mock | Συμπέρασμα |
|---|---|---|---|---|
| `L1-clean` | PASS | `normal-02` | PASS | Συμφωνούν |
| `L2-many` | PASS | `multi-02` | PASS | Συμφωνούν |
| `L3-correction` | FAIL | `conflict-01` | PASS | **Ο fake provider δεν το προσομοίωσε** — το mock περνάει, το live όχι |
| `L4-negation` | PASS | `conflict-03` | PASS | Συμφωνούν |
| `L5-price` | PASS | `llmout-03` | PASS | Συμφωνούν |
| `L6-unknown-qty` | PASS | `partial-02` | PASS | Συμφωνούν |
| `L7-injection` | PASS | `llmout-01` | PASS | Συμφωνούν |
| `L8-cut-blurry` | FAIL | `fail-16-max-tokens` | PASS | **Ο fake provider δεν το προσομοίωσε** — το mock περνάει, το live όχι |

### Αποτυχίες — ανάλυση (καμία αλλαγή κώδικα χωρίς έγκριση)

#### `L3-correction` — Διόρθωση: «12 μέτρα σωλήνα, όχι, τελικά 15 μέτρα»

- **Expected:** 15 pipe, 1 wc
- **Actual:** 12 μ. pipe, 1 τεμ. wc, [εκτός] 15 μ. Τελικά
- **Κείμενο μοντέλου:** `12 μέτρα σωλήνα, όχι, τελικά 15 μέτρα ⏎ 1 τεμάχιο λεκάνη κρεμαστή`
- **Αιτία:** pipe: ποσότητα 12, αναμενόταν 15; σκουπίδια ως γραμμές προσφοράς: «Τελικά»
- **Επίπεδο:** parser / application logic
- **Μικρότερη πιθανή διόρθωση:** Το ίδιο αποτυγχάνει και ως κείμενο χωρίς provider → διόρθωση στον parser (βλ. ίδιο test «-text»).

#### `L8-cut-blurry` — Κομμένη & θολή φωτογραφία

- **Expected:** 12 pipe, 1 wc, 2 valve · όχι: heater, tile · + προειδοποίηση
- **Actual:** 12 μ. pipe, 1 τεμ. wc, 2 τεμ. valve, 4 τεμ. light, 2 τεμ. socket
- **Κείμενο μοντέλου:** `12 μέτρα σωλήνας ⏎ 1 τεμάχιο λεκάνη κρεμαστή ⏎ 2 τεμάχια διακόπτες γωνιακοί ⏎ 4 τεμάχια σποτ ⏎ 2 τεμάχια πρίζες`
- **Αιτία:** η ανάγνωση δεν σημάνθηκε ως πιθανώς ελλιπής (καμία προειδοποίηση)
- **Επίπεδο:** application logic + prompt
- **Μικρότερη πιθανή διόρθωση:** Το prompt να ζητά σήμανση όταν η φωτογραφία φαίνεται κομμένη/θολή (π.χ. τελευταία γραμμή «[ΑΣΑΦΕΣ]»)· η εφαρμογή να δείχνει την ίδια προειδοποίηση με το MAX_TOKENS.

### CRITICAL

_Κανένα._
