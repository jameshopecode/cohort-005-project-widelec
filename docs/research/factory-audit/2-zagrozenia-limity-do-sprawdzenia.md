## 3. Model zagrożeń, wyłącznik, strażnik, twarde limity

### 3.1 Model zagrożeń — skrót (#45, #47, #49, #50, #52, #55)
- **Chronione**: maszyna właściciela, `main`, deploy, sekrety produkcyjne (deploy, Convex), inne repo, kod (tylko na poziomie allowlisty domen).
- **Akceptowalna strata**: `agent/**` + tickety/komentarze/PR-y w tym repo; zużyty limit subskrypcji; wyciek unieważnialnego tokenu Claude; celowany wyciek kodu przez dozwoloną domenę.
- **Zaufane**: GitHub, Anthropic, Convex, dostawca runnera, treść ticketów. **Wrogie**: łańcuch dostaw (npm, akcje, binarki), treść z zewnątrz (prompt injection), niezłośliwie destrukcyjny agent. **Poza modelem**: insider, przejęte konto właściciela.
- **Rdzeń wektorów** (11, #45): obcy kod w procesie z sekretem. Mitygacje: pnpm `allowBuilds`/`strictDepBuilds`, `minimumReleaseAge` ≥ 1440, `trustPolicy: no-downgrade`, `blockExoticSubdeps`; akcje przypięte do SHA; zero `pull_request_target`; brak cache współdzielonego z jobami z sekretami.
- **Kryteria** (#47 z aktualizacjami):
  1. Runner poza maszyną; w kontenerze agenta tylko token Claude (+ canarytoken); token/klucz App nigdy na VM z obcym kodem (#50, #52 zaostrzają #47/#49).
  2. Egress allowlist (GitHub, Anthropic, npm): kontener z iptables (zaostrzony `init-firewall.sh`, DNS tylko do resolvera, bez SSH) + sandbox Claude Code (`allowUnsandboxedCommands: false`, `failIfUnavailable`, WebFetch zabroniony).
  3. Branch rulesety poza `agent/**`; CODEOWNERS na wrażliwych ścieżkach; publish odrzuca `FACTORY_PROTECTED_PATHS`; `.claude/` z `main`; App bez Workflows (#55).
  4. Przejścia HITL tylko od `sender` = `FACTORY_OWNER`; limit runów na ticket.
  5. Joby z kodem `agent/**` bez innych sekretów; sekrety w Environments „tylko `main`”; zero sekretów repo; bez preview deployów.
  6. Gałęzie agenta nigdy na hoście właściciela; podgląd tylko w `sbx` mountless (#49) — Codespaces gorsze.
  7. Wykrywanie: wyłącznik, canarytokens, strażnik; bez platformy monitoringu.

### 3.2 Wyłącznik awaryjny
- #52 (obowiązująca kolejność): 1) Suspend App; 2) unieważnić token Claude (kosz w Settings > Claude Code) albo Settings > Account → log out of all sessions; 3) wyłączyć workflowy; 4) usunąć gałęzie `agent/**`.
- #47 (pierwotnie): 1) token Claude; 2) App; 3) workflowy; 4) gałęzie.
- Usunięcie sekretu w GitHubie **nie** unieważnia tokenu Claude (#42).

### 3.3 Reguły strażnika
- Runy agenta w 24 h > `FACTORY_GUARD_RUNS_24H` (60; pierwotnie 30 w #50) → alert + wyłączenie workflowów agenta.
- Push bota fabryki poza `agent/**` → alert (+ wyłączenie, wg #50). Merge właściciela na `main` OK.
- „Resztę reguł dodajemy później” (#47).

### 3.4 Twarde limity (#48, #50, #51, #53, #55)
| Zmienna / limit | Wartość |
|---|---|
| `FACTORY_TIMEOUT_EXPLORE` / `_IMPLEMENT` / `_REVIEW` / `_DECOMPOSE` | 30 / 60 / 30 / 20 min |
| `FACTORY_MAX_TURNS_EXPLORE` / `_IMPLEMENT` / `_REVIEW` / `_DECOMPOSE` | 80 / 200 / 150 / 40 |
| `timeout-minutes` prepare / publish / CI / strażnik / łańcuch | 10 / 10 / 20 / 5 / 5 (bez zmiennych) |
| `FACTORY_MAX_PARALLEL` | 5 runów agenta globalnie (ręczne triggery nie blokowane) |
| `FACTORY_GUARD_RUNS_24H` | 60 |
| `FACTORY_MAX_RUNS_PER_TICKET` | 10 (issue + PR razem, bez zerowania; po przekroczeniu `needs-human` + marker blokady) |
| `FACTORY_MAX_REVIEW_RUNS` | 3 na PR (zerowany po interwencji człowieka) |
| `FACTORY_MAX_SUBISSUES` | 12 |
| `FACTORY_OWNER` | login właściciela |
| `FACTORY_PROTECTED_PATHS` | `.github/ .claude/ CODEOWNERS .npmrc pnpm-workspace.yaml` |
| Actions | bez karty; stop po 18 $ puli Pro (~3000 min); mail przy 90/100% |
| Claude | extra usage i auto-reload wyłączone; stop na limicie 5 h / tygodniowym |
| `--max-budget-usd` | nieużywany |
| Artefakty | tylko między jobami, retencja 1 dzień |
| Token App | 1 h, unieważniany na końcu joba |
- Zmienne zmienia tylko admin repo; App nie ma uprawnienia Variables (#53). App ID jako zmienna w Environment `factory-github` (#55).

---

## 4. Do sprawdzenia przy budowie

| # | Pozycja | Status w źródle | Ticket |
|---|---|---|---|
| 1 | Szybka unieważnialność tokenu Claude (warunek akceptacji wycieku) | „do weryfikacji” | #41 Notes, #45 |
| 2 | Czas propagacji kosza dla pojedynczego tokenu `setup-token` | „trzeba go sprawdzić przy budowie” | #42 |
| 3 | Kredyty API Max/Ultra a Claude Code (Help Center vs tabela „No”) | „wymaga weryfikacji” | #42 |
| 4 | Runbook rotacji tokenu (wygasa po roku) | „potrzebny” | #42, #52 |
| 5 | Docker Sandboxes na Windows i w trybie headless | „do weryfikacji” | #43 |
| 6 | Egress na Fly; zmierzone czasy startu runnerów | „do weryfikacji” | #43 |
| 7 | Realny koszt Actions wyższy przez CI w tej samej puli | „realnie będzie drożej” | #43 |
| 8 | Preview deploy key Convex — czy nie sięga produkcji | docs nie mówią wprost | #46 |
| 9 | Natywny firewall egress GitHuba (roadmapa 2026) jako przyszły zamiennik | przyszłość | #47, #49 |
| 10 | `gh --attach` z tokenem GitHub App (GA 09.2026, wymaga tokenu użytkownika) | „do sprawdzenia przy budowie” | #48, #53 |
| 11 | E2B `Secret.fill` (beta) z OAuth `claude` i git push | beta | #49 |
| 12 | `sbx` v0.54.0, status GA niepotwierdzony; zgłoszenia Windows #900, #743, #897 | ryzyko rezydualne | #49 |
| 13 | Domeny binarki Convex dla allowlisty (`sbx policy log`) | „ustalić” | #49 |
| 14 | Kod w `sbx` może pisać do schowka hosta | ryzyko rezydualne | #49 |
| 15 | Docelowa skala, próg strażnika, timeouty — spike | „do zweryfikowania” (#54 OPEN) | #50, #51, #53, #54 |
| 16 | Narzut zrzutu „przed” ~+2–4 min/run, ~4 $/mies. | szacunek | #51 |
| 17 | Cena GitHub Pro (~4 $) | „cena do potwierdzenia” | #52 |
| 18 | `PUT …/workflows/{id}/disable` z `GITHUB_TOKEN` (zapas: App + Actions RW) | „do sprawdzenia przy budowie” | #52 |
| 19 | Narzut 3 jobów ~2–3 min/run | szacunek | #52 |
| 20 | Timeouty = ~2–3× oczekiwanego czasu | do korekty przez spike | #53 |
| 21 | Nowy budżet Actions liczy dopiero od dnia utworzenia | „uwaga przy budowie” | #53 |
| 22 | `--max-budget-usd` z tokenem OAuth | nieudokumentowane | #53 |
| 23 | „Require actions pinned to full SHA” w repo konta osobistego | „sprawdzi to skrypt” | #55 |
| 24 | Czy API samo tworzy brakującą etykietę (literówka = śmieć) | „nie wiadomo” | #55 |
| 25 | CODEOWNERS — cicha awaria błędnej linii | sprawdzane skryptem i CI | #55 |
| 26 | Realny czas runów, CI na 1-core, E2B z jobem 1-core, plan Claude przy równoległych runach | otwarte | #54 |
| 27 | Scheduled tasks Claude Code / Claude Code w chmurze (research preview) | odłożone | #44, #47, #49, #50 |
| — | **Założenia nieoznaczone w źródłach, a wymagające sprawdzenia** (moje): | | |
| 28 | Sandbox Claude Code (bubblewrap) w trybie ścisłym wewnątrz kontenera Docker na `ubuntu-latest` (`failIfUnavailable` może wywracać każdy run) | nieoznaczone | #47, #49 |
| 29 | iptables w kontenerze wymaga `NET_ADMIN`; agent nie może mieć roota/sudo, inaczej zdejmie reguły | nieoznaczone | #47, #49 |
| 30 | Zdarzenie dla etykiet na PR (`pull_request: labeled`, nie `issues`) a reguła Environment „tylko `main`” | nieoznaczone | #50, #52 |
| 31 | Natywne sub-issues i `blocked_by` przez API z tokenem App (Issues RW) na koncie Pro | nieoznaczone | #51 |
| 32 | Limit łańcucha `workflow_run` (max 3 poziomy) przy CI → review → strażnik/łańcuch | nieoznaczone | #50, #53 |
| 33 | Zachowanie kolejki `concurrency` (domyślnie 1 oczekujący, nowszy anuluje starszy; `queue:` z #44 nie wybrane w #50) | nieoznaczone | #44, #50 |
| 34 | Mutation testing w CI w 20 min i w implement w 60 min | nieoznaczone | #48, #53 |

---

