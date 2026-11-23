# 2b. Taski bez agenta

Kod deterministyczny, bez Claude. Łańcuch i strażnik to joby końcowe workflowów agenta (układ w [2-taski-przeplyw.md](2-taski-przeplyw.md)); strażnik ma też własny trigger `push`.

## łańcuch

Runner `ubuntu-slim`, `timeout-minutes` 5, Environment `factory-github`, token App tylko `issues: write`.

1. **Trigger**: `issues: closed` sub-issue speca (natywny rodzic z planem decompose; także zamknięcie przez merge PR z `Closes #n`); job końcowy każdego workflowu agenta (`needs: strażnik`, `if: always()`), w tym po decompose i po ponownym `agent:implement-spec`.
2. **Robi**: liczy frontier: otwarte sub-issues z `agent:queued`, których wszystkie blokery są zamknięte jako „completed”. Liczy runy w locie w całym repo: `agent:in-progress` + (`agent:queued` z etykietą-triggerem). Dobiera z frontieru do łącznie `FACTORY_MAX_PARALLEL` = 5 i każdemu dokłada `agent:implement` albo, przy fladze `explore`, `agent:explore`, zostawiając `agent:queued` (zdejmuje je prepare). Ręczne triggery właściciela zajmują pulę, ale nie są blokowane. Kolejny sub-issue rusza po merge poprzednika i buduje się z aktualnego `main` (bez stacked PR). Gdy wszystkie sub-issues są zamknięte: zamyka spec z podsumowaniem (lista PR-ów). Sub-issue zamknięty jako „not planned”, od którego coś zależy: spec dostaje `needs-human` + komentarz wskazujący zależne. Porażka implement sub-issue: komentarz na specu, niezależne gałęzie idą dalej. Czyta i pisze wyłącznie ticket tracker (etykiety, komentarze, zamknięcie speca).
3. **Wyzwala dalej**: runy implement / explore na sub-issues (przez bramkę AFK); zamknięcie speca.
4. **Człowiek wraca**: merge każdego PR; approve po explore sub-issue; po „not planned” właściciel poprawia zależności (usuwa krawędź albo podpina zastępczy sub-issue) i ponownie nakłada `agent:implement-spec`, a łańcuch zdejmuje `needs-human`; sub-issue z `agent:blocked` wznawia ponowne `agent:implement`.
5. **Deduplikacja**: grupa `factory-chain` w trybie domyślnym; łańcuch jest idempotentny (oczekujący run przelicza frontier od zera); liczenie w locie z `agent:queued` + trigger zamyka wyścig limitu 5; bramka AFK wymaga `agent:queued`, które prepare zdejmuje, więc trigger od bota działa raz.

Źródło: [Łańcuch implement-spec](https://github.com/jameshopecode/cohort-005-project-widelec/issues/51), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Twarde limity kosztu i czasu](https://github.com/jameshopecode/cohort-005-project-widelec/issues/53)

## strażnik

Runner `ubuntu-slim`, `timeout-minutes` 5, bez Environment, `GITHUB_TOKEN` `actions: write`, `issues: write`. Reguły w [3a-kontener-wylacznik-limity.md](3a-kontener-wylacznik-limity.md).

1. **Trigger**: job końcowy każdego workflowu agenta (`needs: publish`, `if: always()`); `push` na dowolną gałąź.
2. **Robi**: liczy w API Actions runy workflowów z `FACTORY_AGENT_WORKFLOWS`, w których wystartował job `agent`, w oknie od max(24 h temu, zamknięcie ostatniego `factory-alert`); przy pushu sprawdza, czy bot nie pushował poza `agent/**`. Przy złamaniu reguły zakłada issue `factory-alert` przypisane do właściciela, z checklistą powrotu, i wyłącza wszystkie workflowy z `FACTORY_AGENT_WORKFLOWS` (CI, strażnik i build obrazu zostają). Czyta orchestrator (API Actions) i git host (zdarzenie push). Pisze ticket tracker (alert) i orchestrator (wyłączenie workflowów).
3. **Wyzwala dalej**: nic: zdarzenia z `GITHUB_TOKEN` nie uruchamiają runów.
4. **Człowiek wraca**: issue `factory-alert`; właściciel ocenia, w razie potrzeby uruchamia wyłącznik awaryjny, potem `setup --enable-agent-workflows` i zamyka issue. Workflowy nie włączają się same.
5. **Deduplikacja**: grupa `factory-guard` w trybie domyślnym; najwyżej jedno otwarte `factory-alert`: przy otwartym strażnik dopisuje komentarz.

Źródło: [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Wybór orchestratora](https://github.com/jameshopecode/cohort-005-project-widelec/issues/50), [Rozkład sekretów i uprawnień](https://github.com/jameshopecode/cohort-005-project-widelec/issues/52)

## CI (automated checks)

Bez sekretów i bez Environment, `contents: read`, bez cache Actions.

1. **Trigger**: `pull_request` `opened` i `synchronize` do `main` (PR-y fabryki z `agent/<n>` i własne PR-y właściciela). Nigdy `pull_request_target`.
2. **Robi**: job `ci` na `ubuntu-slim` (`timeout-minutes` ≤ 15): typecheck, lint, testy na merge ref; na PR zmieniającym `CODEOWNERS` failuje, gdy `GET /repos/{owner}/{repo}/codeowners/errors` zwraca błędy. `ci` to wymagany status check rulesetu `main`. Job `mutation` na `ubuntu-latest`, tylko przy `opened` (raz na PR): testy mutacyjne; jego wynik czyta review. Czyta kod (git host). Pisze statusy checków na PR.
3. **Wyzwala dalej**: `workflow_run` `completed` → automated review dla gałęzi `agent/<n>`, przy wyniku `success` i `failure`.
4. **Człowiek wraca**: pośrednio: czerwone CI naprawia review w limicie 3 runów, potem `needs-human`; czerwony `ci` blokuje merge.
5. **Deduplikacja**: grupa `ci-<nr-PR>` z `cancel-in-progress: true`: nowy push anuluje CI starszego SHA, więc wynik zawsze dotyczy głowy PR.

Źródło: [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Budżet minut i tempo fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/59), [Konfiguracja git hosta i ticket trackera pod fabrykę](https://github.com/jameshopecode/cohort-005-project-widelec/issues/55), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## build obrazu

Job build na `ubuntu-latest`, `GITHUB_TOKEN` `packages: write`, `contents: read`, bez cache (żadnego `cache-from: type=gha` ani `actions/cache`). Job publish na `ubuntu-slim`, Environment `factory-github`, token App `contents: write`, `pull_requests: write`.

1. **Trigger**: `push` na `main` zmieniający katalog obrazu; `workflow_dispatch` od właściciela.
2. **Robi**: buduje obraz (zawartość w pliku 3a), pushuje go do prywatnego GHCR i odczytuje digest `@sha256:` oraz wersję Playwright w obrazie. Publish zapisuje oba w pliku digestu na gałęzi `agent/image-<krótki-digest>` i otwiera PR „bump digest”, zamykając wcześniejszy otwarty PR „bump digest”. Czyta kod. Pisze GHCR, gałąź i PR na git hoście.
3. **Wyzwala dalej**: otwarcie PR → CI (review się nie uruchamia: gałąź nie jest `agent/<nr-issue>`). Po merge job agent bierze digest z pliku na `main`. Plik digestu leży poza katalogiem obrazu, więc merge nie uruchamia kolejnego buildu.
4. **Człowiek wraca**: właściciel zatwierdza i mergeuje PR „bump digest” (plik digestu jest w CODEOWNERS); niezgodność wersji Playwright w prepare (`needs-human`) sygnalizuje potrzebę przebudowy.
5. **Deduplikacja**: grupa `factory-image` z `cancel-in-progress: true` (wygrywa najnowszy build); jedna gałąź na digest; nowy PR zamyka poprzedni otwarty „bump digest”.

Źródło: [Kontener agenta na hostowanym runnerze](https://github.com/jameshopecode/cohort-005-project-widelec/issues/60), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## setup

1. **Trigger**: ręcznie przez właściciela; tryb `setup --enable-agent-workflows` po alercie strażnika.
2. **Robi**: jeden idempotentny skrypt `gh api` w repo docelowym, który jest zarazem dokumentacją konfiguracji: rulesety, ustawienia PR i Actions, zmienne `FACTORY_*`, 10 etykiet, Environments `factory-agent`, `factory-github`, `production` z regułą „tylko `main`”, `CODEOWNERS`; sprawdza `codeowners/errors` i dostępność „Require actions to be pinned to a full-length commit SHA”. Tryb `--enable-agent-workflows` włącza workflowy z `FACTORY_AGENT_WORKFLOWS`. Ręczna checklista obok skryptu: utworzenie i instalacja App, klucz App i App ID, `CLAUDE_CODE_OAUTH_TOKEN`, kanarki, test unieważnienia tokenu Claude, brak karty w GitHubie, extra usage Claude wyłączone. Czyta i pisze ustawienia git hosta i etykiety ticket trackera (zawartość: plik 3).
3. **Wyzwala dalej**: nic.
4. **Człowiek wraca**: to właściciel uruchamia skrypt i przechodzi checklistę.
5. **Deduplikacja**: idempotencja: `gh label create --force`, wartości zmiennych i rulesetów nadpisywane.

Źródło: [Konfiguracja git hosta i ticket trackera pod fabrykę](https://github.com/jameshopecode/cohort-005-project-widelec/issues/55), [Zestawienie końcowe projektu fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/56), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## podgląd `sbx`

Lokalny skrypt na Windows 11 właściciela (Windows Hypervisor Platform, `winget install Docker.sbx`, konto Docker). Sandbox to microVM bez dostępu do gniazda Dockera i plików hosta. To jednorazowe środowisko podglądu, nie runner.

1. **Trigger**: ręcznie przez właściciela, dla jednej gałęzi `agent/<n>`.
2. **Robi**: `sbx settings set ssh.agentForwardingEnabled false` + `sbx daemon restart`; `sbx policy init deny-all` + `sbx policy allow network` dla `registry.npmjs.org`, `github.com`, `version.convex.dev`, `api.convex.dev`, `release-assets.githubusercontent.com`; `sbx create --name <name> --skills=off -p 127.0.0.1:5173:5173 shell` bez ścieżki (mountless), bez `--clone` i `sbx secret`; na hoście `git fetch` + `git bundle` samej gałęzi → `sbx cp`; w środku `pnpm install`, aplikacja z lokalnym Convexem na `0.0.0.0`, opcjonalnie automated checks, bez Claude; na koniec `sbx rm -f <name>`. Czyta git host (fetch na hoście, bez uruchamiania kodu i hooków). Pisze nic.
3. **Wyzwala dalej**: nic.
4. **Człowiek wraca**: to człowiek ogląda gałąź; wnioski zapisuje jako uwagi na PR.
5. **Deduplikacja**: jedna nazwa sandboxa na gałąź, usuwana na końcu skryptu; skrypt uruchamia jeden człowiek.

Źródło: [Wybór runnera](https://github.com/jameshopecode/cohort-005-project-widelec/issues/49), [Kontener agenta na hostowanym runnerze](https://github.com/jameshopecode/cohort-005-project-widelec/issues/60)
