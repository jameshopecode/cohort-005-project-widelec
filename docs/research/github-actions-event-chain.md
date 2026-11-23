# Fakty GitHub Actions dla łańcucha zdarzeń fabryki

Ticket: [#57](https://github.com/jameshopecode/cohort-005-project-widelec/issues/57). Kontekst: audyt [luki i sprzeczności](https://github.com/jameshopecode/cohort-005-project-widelec/blob/research/factory-audit/docs/research/factory-audit/3-luki-i-sprzecznosci.md), pkt 23, 24, 27, 28, 13.

Wszystkie źródła sprawdzone **2026-11-23**. Tylko źródła pierwotne: docs.github.com, github.blog/changelog, cli.github.com oraz tracker `cli/cli` (opiekunowie narzędzia). „**Nieudokumentowane**” oznacza, że żadne z tych źródeł nie mówi tego wprost; to, co tak oznaczono, trzeba sprawdzić eksperymentem.

Szczegóły i cytaty:

- [1-environment-i-aktor.md](./github-actions-event-chain/1-environment-i-aktor.md): pytania 1–3 (Environment „tylko `main`”, aktor zdarzeń z tokenu App, głębokość `workflow_run`).
- [2-concurrency-i-zalaczniki.md](./github-actions-event-chain/2-concurrency-i-zalaczniki.md): pytania 4–5 (`concurrency` i `queue`, `gh … --attach` z tokenem App).

## Odpowiedzi w skrócie

1. **Environment „tylko `main`”.** Reguła gałęzi jest dopasowywana do `GITHUB_REF` runu. Dla `pull_request` (także `labeled`) `GITHUB_REF` to `refs/pull/N/merge`, więc job **nie dostanie** Environment ani jego sekretów, chyba że dodamy regułę `refs/pull/*/merge`. `issue_comment`, `workflow_run` i `pull_request_target` mają `GITHUB_REF` = gałąź domyślna, więc reguła „tylko `main`” **przepuszcza** je (jeśli `main` jest gałęzią domyślną).
2. **Token instalacji App.** Działania z tokenem instalacji są przypisane do konta bota aplikacji (`nazwa[bot]`). Docs wprost zalecają token instalacji App zamiast `GITHUB_TOKEN`, żeby zdarzenia wyzwalały workflowy. To, że `github.actor`/`sender` ma w runie wartość `nazwa[bot]`, wynika z tego pośrednio; dosłownie jest **nieudokumentowane**.
3. **`workflow_run`.** Docs nadal mówią „nie więcej niż trzy poziomy” (A → B → C → D działa, E i F już nie). Czy zdarzenie z tokenu App „resetuje” łańcuch: **nieudokumentowane**.
4. **`concurrency`.** Domyślnie grupa ma 1 run aktywny i 1 oczekujący; nowy run anuluje starszy oczekujący. Od **2026-05-07** jest `queue: max`: do 100 oczekujących, FIFO (bez gwarancji kolejności). Ograniczenia: nie łączy się z `cancel-in-progress: true` (błąd walidacji), a run ponad limit jest odrzucany.
5. **`--attach`.** Flaga istnieje od gh **v2.99.0** (2026-09-01) w `gh issue comment` i `gh pr comment`. Changelog wymienia tylko token OAuth z `gh auth login` i klasyczny PAT. Z tokenem instalacji App (`ghs_`) endpoint uploadu zwraca 404, także w prywatnym repo z prawem zapisu ([cli/cli#14309](https://github.com/cli/cli/issues/14309), otwarte, `blocked`). Odpowiedź: **nie działa**.
