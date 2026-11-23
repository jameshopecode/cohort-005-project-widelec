# Software factory — zestawienie decyzji z mapy #41 (DRAFT)

Źródła: treść mapy #41 (stan: OPEN, sekcja „Decisions so far”), treści i wszystkie komentarze zamkniętych ticketów #42–#53 i #55, otwarty spike #54 (zalinkowany z #50, #51, #53), gałąź `research/runner-options` (wyliczenia kosztów runnera). Słownictwo: skill `software-factory`.

Konwencja: `(#NN)` = ticket, z którego pochodzi informacja. „BRAK ODPOWIEDZI” = decyzje tego nie rozstrzygają.

---

## 1. Sloty usług i koszt miesięczny

| Slot | Produkt | Koszt/mies. (USD) | Źródło |
|---|---|---|---|
| Ticket tracker | GitHub Issues (etykiety + ukryte markery w komentarzach jako stan) | 0 | #50 (potwierdzenie domyślnego z #41) |
| Ticket source | **brak** (tickety pisze tylko właściciel; feedback button i monitory poza zakresem) | 0 | #41 Notes / Out of scope |
| Git host | GitHub, konto osobiste na **GitHub Pro**, repo prywatne | patrz pozycja GitHub Pro | #52, #55 |
| Orchestrator | GitHub Actions (zdarzenia + `concurrency`, bez crona); scheduled tasks Claude Code odłożone | wliczony w pulę minut runnera | #44, #50 |
| Runner | hostowany runner GitHub Actions `ubuntu-latest`, 3 joby na osobnych VM (prepare / agent / publish), agent w kontenerze `docker run` z iptables + ścisły sandbox Claude Code | bazowo ~3–9; wysoko **⚠️ ~41–47** | #43, #49, #52 |
| Observability platform | **brak** (strony runów Actions wystarczą) | 0 | #41 Notes, #43 |

### Pozycje kosztowe

| Pozycja | Koszt/mies. (USD) | Uwagi | Źródło |
|---|---|---|---|
| **GitHub Pro** | ~4 (historycznie; „cena do potwierdzenia”) | Wymagany dla rulesetów, CODEOWNERS i Environments w prywatnym repo; pula Actions 18 $ (~3000 min) | #52 |
| Minuty Actions (runner + orchestrator + CI), scenariusz bazowy 8 runów/dzień × 20 min | ~3–9 ponad pulę | Wyliczenie: 3470 min × 0,006 = 20,8 $ minus pula 18 $ (Pro) lub 12 $ (Free) | #43, #49 |
| Minuty Actions, scenariusz wysoki 15 runów/dzień × 30 min | **⚠️ ~41–47** ponad pulę | 58,5 $ minus pula 18/12 $ | #43, #49 |
| Narzut 3 jobów na run (start VM, zaokrąglenie do minuty) | „kilka $” przy wysokiej skali (~2–3 min/run) | | #52 |
| Zrzut „przed” w implement | ~4 przy wysokim wariancie (~+2–4 min/run) | | #51 |
| Artefakty Actions | 0 (1 GB w Pro, retencja 1 dzień; nadwyżka 0,25 $/GB-mies.) | | #53 |
| Cache Actions | 0 (10 GB/repo) | | #53 |
| Convex w runie (lokalny backend anonimowy + `convex-test`) | 0 | | #46 |
| Firewall w kontenerze (iptables) + sandbox Claude Code | 0 | | #47, #49 |
| Canarytokens | 0 | | #47 |
| Docker Sandboxes (`sbx`) do lokalnego podglądu | 0 (wymaga konta Docker) | | #49 |
| Subskrypcja Claude | poza kosztem infrastruktury (subskrypcja właściciela; plan Pro/Max/Ultra nie wybrany) | extra usage wyłączone | #42, #53 |
| Opcja: E2B Hobby (wyjście kosztowe / bezpieczeństwa) | ~10–27 + job czekający | nie na start | #49 |
| Opcja: Harden-Runner Enterprise | ~16 | alternatywa, nie wybrana | #47 |
| Odrzucone: E2B Pro 150 ⛔, Inngest Pro 99 ⚠️ | — | | #43, #44 |

### Suma

| Wariant | Suma/mies. | Uwagi |
|---|---|---|
| Na start, bez karty (decyzja #53) | **~4 $** (tylko GitHub Pro) | Twardy stop po wyczerpaniu 18 $ puli; nadwyżki nie da się zapłacić, fabryka staje → `agent:blocked` |
| Bazowy (z kartą i budżetem) | ~7–13 $ (4 + 3–9) + CI + narzut jobów | ✅ < 40 $ |
| Wysoki (z kartą i budżetem) | **⚠️ ~49–60 $** (4 + 41–47 + ~4 zrzuty + kilka $ narzutu) + CI | 40–100 $, wymaga oznaczenia |
| Docelowe tempo ze spike'a #54 (2–3 specy/dzień, ~57 runów agenta/dzień) | **⛔ ~150 $ + CI + 4 $** | powyżej NO GO; spike otwarty, „nie blokuje mapy” |

---

## 2. Taski — 5 pytań

Fazy ticketu (#48): explore (AFK) → approve (HITL) → implement (AFK) → automated review (AFK) → merge (HITL). Każdy run agenta = 3 joby (#52): **prepare** (token App: issues/PR write, contents read; sprawdza `sender` wobec `FACTORY_OWNER`, limity, trigger; nakłada `agent:in-progress`; zrzut ticketu do artefaktu) → **agent** (kontener; tylko token Claude + canarytoken; `.claude/` podmienione na wersję z `main`; zwraca `result.json` + `git bundle`) → **publish** (token App: contents/issues/PR write; odrzuca bundle dotykający `FACTORY_PROTECTED_PATHS`; push wyłącznie `agent/<n>`; komentarze, etykiety, PR). Porażka runu (crash, timeout, `error_max_turns`, limit subskrypcji, wyczerpana pula) → `agent:in-progress` → `agent:blocked` + komentarz z linkiem; bez automatycznego ponawiania (#48, #53).

### 2.1 explore (#48, #50, #51)
1. **Trigger**: utworzenie ticketu przez właściciela (orchestrator sprawdza autora i nakłada `agent:explore`) albo ręczne `agent:explore`; pomijany, gdy ticket powstał z `agent:implement` / `agent:implement-spec`; w łańcuchu: łańcuch nakłada `agent:explore` na sub-issue z flagą `explore`.
2. **Robi**: czyta ticket i kod (ze zrzutu w artefakcie), odtwarza problem w uruchomionej aplikacji (lokalny Convex, przeglądarka), pisze komentarz z planem (pliki, podejście, kryteria akceptacji, ryzyka). Nie pushuje. Czyta: GitHub Issues (przez prepare), kod. Pisze (przez publish): komentarz, etykiety issue. Limity: 30 min / 80 tur.
3. **Wyzwala dalej**: `needs-human`.
4. **Człowiek**: approve = zamiana na `agent:implement` (tylko `sender` = właściciel); poprawki planu = komentarz + ponowne `agent:explore`.
5. **Deduplikacja**: `concurrency` `factory-<nr-issue>`, `cancel-in-progress: false`; przejęcie `agent:in-progress`; trigger na tickecie w toku ignorowany z komentarzem; run z kolejki sprawdza, czy trigger nadal wisi.
- Uwaga: czy explore nadal robi dowody „przed” — sprzeczność #48 vs #51 (sekcja 5).

### 2.2 implement (#48, #50, #52, #53)
1. **Trigger**: `agent:implement` na issue (od właściciela po approve albo od łańcucha na sub-issue); `agent:implement` na PR = zmiany zamówione przez człowieka.
2. **Robi**: na gałęzi `agent/<nr-issue>` buduje, aż w runie przejdą automated checks (typy, lint, testy, mutacje); dowody przed (baza PR, tylko tickety z UI) i po; publish pushuje `agent/<n>` i otwiera **draft PR** (`Closes #n`), statusy przenoszą się na PR. Dowody inline (`gh --attach`, zapas: `agent/evidence-<n>`). Limity: 60 min / 200 tur.
3. **Wyzwala dalej**: push (token App) → CI → przy zielonym CI `workflow_run` → automated review.
4. **Człowiek**: `agent:blocked` z komentarzem (porażka); faza merge. Czerwone CI po pushu: BRAK ODPOWIEDZI.
5. **Deduplikacja**: jw. + deterministyczna nazwa gałęzi (nie powstanie drugi PR). Sposób pushu przy ponownym implement na istniejącej gałęzi (fast-forward vs force): BRAK ODPOWIEDZI.

### 2.3 automated review (#48, #50, #53, #55)
1. **Trigger**: zielone CI na PR fabryki (`workflow_run`, YAML z `main`) albo ręczne `agent:review` na PR (tylko od właściciela).
2. **Robi**: czyta diff na zimno względem standardów i ticketu; sam poprawia i (przez publish) pushuje; weryfikuje w przeglądarce z dowodami przed/po (dla UI wizualny obowiązkowy; „przed” z implement, gdy SHA bazy się zgadza — #51); jedna recenzja: znaleziska naprawione/nienaprawione + werdykt. Limity: 30 min / 150 tur.
3. **Wyzwala dalej**: gdy pushował → CI → kolejny review ze świeżym kontekstem. **Pass** (decyduje publish) tylko bez pusha i z dowodami → PR z draft na „ready for review” + `needs-human`.
4. **Człowiek**: merge; zmiany = komentarz + `agent:implement` na PR; po 3 runach bez pass → `needs-human`.
5. **Deduplikacja**: `concurrency` per ticket (`factory-<nr-issue>`, numer z gałęzi `agent/<n>`; #48 mówił „per numer PR”); licznik runów review po markerze w recenzjach, zerowany po interwencji człowieka (co jest „interwencją”: BRAK ODPOWIEDZI).

### 2.4 decompose (#51, #53)
1. **Trigger**: `agent:implement-spec` nałożone przez właściciela na spec (spec pisany lokalnie `/to-spec`); explore pomijany; bez approve (furtka otwarta).
2. **Robi**: agent w kontenerze czyta spec i kod, nie uruchamia aplikacji; `result.json` z 1–12 ticketami (tytuł, „What”, „Done when”, zależności, flaga `explore`); cięcie „jeden ticket = jeden moduł, route na końcu, nazwy z glossary”. Publish tworzy natywne sub-issues + natywne `blocked_by`, każdy z `agent:queued`. Limity: 20 min / 40 tur.
3. **Wyzwala dalej**: łańcuch (jednorazowo).
4. **Człowiek**: porażka → `agent:blocked` na specu, bez ponawiania.
5. **Deduplikacja**: `concurrency` `factory-<nr speca>`; pierwszy krok zamienia trigger na `agent:in-progress`; gdy spec ma już sub-issues, decompose tylko popycha łańcuch. Częściowy publish (część sub-issues utworzona, potem crash): BRAK ODPOWIEDZI.

### 2.5 łańcuch / chain (deterministyczny job, bez agenta) (#51, #53)
1. **Trigger**: zamknięcie sub-issue, którego rodzic ma `agent:implement-spec` (także przez merge PR z `Closes #n`); koniec decompose; ponowne `agent:implement-spec` na podzielonym specu; koniec każdego runu agenta (`workflow_run`, #53).
2. **Robi**: liczy frontier (otwarte sub-issues z `agent:queued`, wszystkie blokery zamknięte jako „completed”); dobiera do globalnie `FACTORY_MAX_PARALLEL` = 5 runów z `agent:in-progress` (#53; wcześniej #51: „wszystkie naraz”); zdejmuje `agent:queued` i nakłada tokenem App `agent:implement` albo `agent:explore`. Gdy wszystkie sub-issues zamknięte: zamyka spec z podsumowaniem (lista PR-ów). Kolejny sub-issue po merge poprzednika, nie stacked. Limit 5 min.
3. **Wyzwala dalej**: zwykłe taski implement/explore; zamknięcie speca.
4. **Człowiek**: merge każdego PR; approve po explore; sub-issue „not planned” → łańcuch staje, spec `needs-human` + komentarz; porażka implement sub-issue → `agent:blocked` na nim, niezależne gałęzie dalej, komentarz na specu, ponowne `agent:implement` wznawia. Jak wznowić łańcuch po „not planned” (zależne nigdy się nie odblokują): BRAK ODPOWIEDZI.
5. **Deduplikacja**: jedna globalna grupa `factory-chain` (#53; w #51: `factory-<nr speca>`); rusza tylko sub-issue z `agent:queued`, etykieta schodzi przed nałożeniem triggera; implement sub-issue w `factory-<nr sub-issue>`.

### 2.6 strażnik / guard (deterministyczny, bez agenta) (#47, #50, #51, #52, #53)
1. **Trigger**: `workflow_run` po każdym runie fabryki; każdy `push`. Brak zegara.
2. **Robi**: liczy runy **agenta** z ostatnich 24 h (joby łańcucha się nie liczą), próg `FACTORY_GUARD_RUNS_24H` = 60; sprawdza, czy bot fabryki nie pushował poza `agent/**`. Alert: issue `factory-alert` przypisane do właściciela + `gh workflow disable` workflowów agenta (CI i strażnik zostają). `GITHUB_TOKEN` z `actions: write, issues: write` (zapas: App z Actions RW — do sprawdzenia). Limit 5 min.
3. **Wyzwala dalej**: nic (zdarzenia z `GITHUB_TOKEN` nie uruchamiają runów).
4. **Człowiek**: issue `factory-alert`; ręczny wyłącznik awaryjny; ponowne włączenie workflowów: BRAK ODPOWIEDZI (procedura).
5. **Deduplikacja**: BRAK ODPOWIEDZI (wiele równoczesnych `workflow_run` może założyć wiele alertów; brak grupy `concurrency` dla strażnika).

### 2.7 CI (automated checks) (#48, #52, #53, #55)
1. **Trigger**: `pull_request` na `agent/**` (nigdy `pull_request_target`); required check `ci` na `main`.
2. **Robi**: te same checks co w runie (typy, lint, testy, mutacje), `contents: read`, bez sekretów i Environment; na PR zmieniających `CODEOWNERS` failuje przy błędach `codeowners/errors`. Limit 20 min.
3. **Wyzwala dalej**: zielone → automated review (`workflow_run`).
4. **Człowiek**: czerwone CI — BRAK ODPOWIEDZI (nikt nie zmienia etykiety; PR zostaje w drafcie bez statusu).
5. **Deduplikacja**: BRAK ODPOWIEDZI (grupa `concurrency` dla CI nieokreślona).

### 2.8 skrypt setupu (#55)
1. **Trigger**: ręcznie przez właściciela.
2. **Robi**: jeden idempotentny skrypt `gh api`: rulesety (`main`, `poza-agent`, `tagi`, `evidence`), ustawienia PR i Actions, zmienne `FACTORY_*`, 9 etykiet (`gh label create --force`, domyślne usunięte), sprawdzenie `codeowners/errors` i dostępności „require pinned SHA”. Pisze: GitHub (ustawienia repo, Issues).
3. **Wyzwala dalej**: nic.
4. **Człowiek**: to właściciel; skrypt = dokumentacja konfiguracji.
5. **Deduplikacja**: idempotencja (`--force`, wartości nadpisywane).
- Czy skrypt tworzy też Environments (`factory-agent`, `factory-github`, `production`) z regułą „tylko `main`”, App i sekrety: BRAK ODPOWIEDZI (#55 wymienia tylko rulesety, ustawienia, zmienne, etykiety).

### 2.9 wyłącznik awaryjny (procedura ręczna, nie task) (#47, #52)
1. **Trigger**: decyzja właściciela (np. alert strażnika, canarytoken).
2. **Robi** (kolejność wg #52): Suspend App → unieważnienie tokenu Claude / wylogowanie wszystkich sesji → wyłączenie workflowów → usunięcie gałęzi `agent/**` (z `agent/evidence-*` przez bypass admina).
3. **Wyzwala dalej**: nic.
4. **Człowiek**: cały czas; powrót do pracy: BRAK ODPOWIEDZI.
5. **Deduplikacja**: n/d. Skrypt/runbook: BRAK ODPOWIEDZI (tylko lista kroków).

### 2.10 lokalny podgląd gałęzi (skrypt `sbx`, nie runner) (#49)
1. **Trigger**: ręcznie przez właściciela.
2. **Robi**: wyłącza SSH agent forwarding; `sbx policy init deny-all` + allowlista (npm, github.com, domeny binarki Convex); `sbx create` mountless, bez `--clone`/`sbx secret`, port 127.0.0.1:5173; na hoście `git fetch` + `git bundle` gałęzi → `sbx cp`; w środku `pnpm install`, aplikacja z lokalnym Convexem, opcjonalnie checks, bez Claude; na koniec `sbx rm -f`. Czyta: GitHub (fetch). Pisze: nic.
3. **Wyzwala dalej**: nic.
4. **Człowiek**: to człowiek.
5. **Deduplikacja**: nazwa sandboxa; nie dotyczy.

### 2.11 Pozostałe
- **Rotacja tokenu Claude** (co rok): „krok w procedurze, bez automatyki” (#42, #52). Runbook: BRAK ODPOWIEDZI.
- **Rotacja klucza App**: tylko po incydencie, do 25 kluczy naraz (#52).
- **Workflow deployu** (Environment `production`, tylko `main`): istnieje w rozkładzie sekretów (#52), ale 5 pytań: BRAK ODPOWIEDZI (poza zakresem mapy?).
- **Furtki AFK**: approve AFK (jedna reguła w orchestratorze, #48); merge AFK przez drugą App „merger” (#55); approve przed łańcuchem (#51).

---

