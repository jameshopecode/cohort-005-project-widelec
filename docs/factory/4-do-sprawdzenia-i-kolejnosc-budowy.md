# 4. Do sprawdzenia przy budowie i kolejność budowy

## Do sprawdzenia przy budowie

Każdą pozycję sprawdza krok budowy podany w kolumnie „Krok”. Wynik, który przeczy projektowi, wraca do właściciela jako ticket, zanim krok zostanie uznany za ukończony.

### Token i Claude

| #   | Pozycja                                                                                                                                                         | Krok             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Unieważnialność tokenu Claude: utwórz token testowy `claude setup-token`, unieważnij go koszem w Settings > Claude Code, potwierdź 401; zanotuj czas propagacji | setup            |
| 2   | Runbook rocznej rotacji tokenu Claude (wymiana `CLAUDE_CODE_OAUTH_TOKEN` w `factory-agent`)                                                                     | setup            |
| 3   | Domeny samego `claude` z tokenem: log `tinyproxy` z pierwszego runu, przy `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`; brakujące dopisać do listy              | kontener / obraz |
| 4   | Czy kredyty API planów Max/Ultra dotyczą Claude Code (niski priorytet; plan niewybrany)                                                                         | po 1. miesiącu   |

### GitHub Actions i zdarzenia

| #   | Pozycja                                                                                                                                                                                  | Krok                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 5   | Dosłowne `sender.type == "Bot"` i `sender.login == "<slug>[bot]"` dla etykiety nałożonej tokenem App (bramka AFK)                                                                        | decompose / łańcuch  |
| 6   | `PUT /repos/{owner}/{repo}/actions/workflows/{id}/disable` z `GITHUB_TOKEN` `actions: write`; zapas: App dostaje Actions RW, a strażnik wybija token tylko z `permission-actions: write` | strażnik             |
| 7   | Natywne sub-issues i `blocked_by` przez API z tokenem App (Issues RW)                                                                                                                    | decompose / łańcuch  |
| 8   | Czy API tworzy brakującą etykietę przy literówce (śmieciowa etykieta)                                                                                                                    | setup                |
| 9   | „Require actions to be pinned to a full-length commit SHA” w repo konta osobistego                                                                                                       | setup                |
| 10  | Cicha awaria błędnej linii `CODEOWNERS`: skrypt i CI failują na `codeowners/errors`                                                                                                      | setup, CI            |
| 11  | `issues: labeled` przy utworzeniu ticketu od razu z etykietą (`agent:implement`, `agent:implement-spec`)                                                                                 | implement            |
| 12  | CI bez cache mieści się w 15 min na `ubuntu-slim`; zapas: job `ci` na `ubuntu-latest`                                                                                                    | CI                   |
| 13  | Czy szybki `synchronize` (grupa `ci-<nr-PR>` z `cancel-in-progress`) nie gubi jedynego przebiegu mutacji z `opened`                                                                      | CI                   |
| 14  | `timeout-minutes` dla joba `mutation` i buildu obrazu z realnych czasów                                                                                                                  | CI, kontener / obraz |
| 15  | Realne czasy runów z 1. miesiąca zastępują szacunek ~0,62 $/ticket (mutacje założone na ~15 min, decompose ~8 min)                                                                       | po 1. miesiącu       |
| 16  | Nowy budżet Actions liczy użycie dopiero od dnia utworzenia                                                                                                                              | po 1. miesiącu       |
| 17  | Cena GitHub Pro (~4 $)                                                                                                                                                                   | setup                |

### Kontener i obraz

| #   | Pozycja                                                                                                                 | Krok             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 18  | Chromium (`playwright install --with-deps chromium`) uruchomiony pod ścisłym sandboxem Claude Code w kontenerze         | kontener / obraz |
| 19  | Limit magazynu GHCR na Pro (wspólny 1 GB z artefaktami) i sprzątanie starych wersji obrazu (koszt liczony dla 2 wersji) | kontener / obraz |
| 20  | Własny profil AppArmor zamiast `apparmor=unconfined` (opcjonalne zaostrzenie)                                           | po budowie       |
| 21  | Natywny firewall egress GitHuba jako przyszły zamiennik `tinyproxy` + iptables                                          | po budowie       |

### Dowody i `sbx`

| #   | Pozycja                                                                                                                   | Krok          |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 22  | Wzrost gałęzi `agent/evidence-*` i utrata linków w komentarzach po wyłączniku awaryjnym                                   | implement     |
| 23  | `sbx` v0.54.0 (status GA) na Windows: zgłoszenia #900 (WSL2 / Docker Desktop), #743 (Smart App Control), #897 (pliki git) | podgląd `sbx` |
| 24  | Pełna lista domen binarki Convex w `sbx` (`sbx policy log`)                                                               | podgląd `sbx` |
| 25  | Preview deploy key Convex nie sięga produkcji (tylko jeśli kiedyś potrzebny; poza runem agenta)                           | po budowie    |

### Materiały dowodowe

- Kontener, sandbox, egress, cache: repo [factory-runner-spike](https://github.com/jameshopecode/factory-runner-spike) (`image/scripts/firewall.sh`, `sandbox-probe.sh`, `probe/seccomp.sh`); jednorazowe, do usunięcia po przekazaniu do budowy.
- Zdarzenia Actions, Environment, aktor, `concurrency`, załączniki: [github-actions-event-chain](https://github.com/jameshopecode/cohort-005-project-widelec/blob/research/github-actions-event-chain/docs/research/github-actions-event-chain.md).
- Audyt poprzedniego zestawienia: [factory-audit](https://github.com/jameshopecode/cohort-005-project-widelec/tree/research/factory-audit/docs/research/factory-audit).
- Pozostałe: [runner-options](https://github.com/jameshopecode/cohort-005-project-widelec/blob/research/runner-options/docs/research/runner-options.md), [orchestrator-options](https://github.com/jameshopecode/cohort-005-project-widelec/blob/research/orchestrator-options/docs/research/orchestrator-options.md), [attack-vectors](https://github.com/jameshopecode/cohort-005-project-widelec/blob/research/attack-vectors/docs/research/attack-vectors.md), [claude-subscription-headless](https://github.com/jameshopecode/cohort-005-project-widelec/blob/research/claude-subscription-headless/docs/research/claude-subscription-headless.md), [convex-in-runs](https://github.com/jameshopecode/cohort-005-project-widelec/blob/research/convex-in-runs/docs/research/convex-in-runs.md).

Źródło: [Subskrypcja Claude w runach bez człowieka](https://github.com/jameshopecode/cohort-005-project-widelec/issues/42), [Wybór runnera](https://github.com/jameshopecode/cohort-005-project-widelec/issues/49), [Rozkład sekretów i uprawnień](https://github.com/jameshopecode/cohort-005-project-widelec/issues/52), [Twarde limity kosztu i czasu](https://github.com/jameshopecode/cohort-005-project-widelec/issues/53), [Konfiguracja git hosta i ticket trackera pod fabrykę](https://github.com/jameshopecode/cohort-005-project-widelec/issues/55), [Zestawienie końcowe projektu fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/56), [Fakty GitHub Actions dla łańcucha zdarzeń fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/57), [Budżet minut i tempo fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/59), [Kontener agenta na hostowanym runnerze](https://github.com/jameshopecode/cohort-005-project-widelec/issues/60), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## Kolejność budowy

Każdy krok jest ukończony dopiero, gdy spełnia całe kryterium ukończenia i przeszedł pozycje „do sprawdzenia” przypisane do niego. Joby końcowe strażnika i łańcucha dochodzą w krokach 7–8; wcześniej workflowy agenta kończą się na publish.

1. **setup** (plik 2b „setup”, plik 3 „Konfiguracja git hosta”, „Sekrety i uprawnienia”). Ukończony, gdy: drugie uruchomienie skryptu niczego nie zmienia; repo ma 4 rulesety, 10 etykiet (bez domyślnych), wszystkie zmienne `FACTORY_*`, 3 Environments „tylko `main`” i `CODEOWNERS` bez błędów; App ma dokładnie Contents RW, Issues RW, Pull requests RW, Metadata R; sekrety leżą tylko w Environments; konto GitHub nie ma karty; extra usage Claude wyłączone; pozycje 1, 2, 8, 9, 10, 17 sprawdzone.
2. **CI** (plik 2b „CI”). Ukończony, gdy: PR właściciela dostaje zielony wymagany check `ci` na merge ref; czerwony `ci` blokuje merge; nowy push anuluje CI starszego SHA; `mutation` biegnie tylko przy `opened`; żaden job nie używa cache ani sekretów; pozycje 12, 13, 14 (mutacje) sprawdzone.
3. **kontener / obraz** (plik 3a „Obraz kontenera”, „Uruchomienie joba agent”, „Egress”; plik 2b „build obrazu”). Ukończony, gdy: build wypycha obraz do GHCR, a App otwiera PR „bump digest” z `agent/image-<krótki-digest>`, który właściciel mergeuje; w testowym jobie na `main` z Environment `factory-agent` Claude Code startuje z `failIfUnavailable`, agent nie ma DNS ani `sudo`, `iptables -F` jest odrzucane, `github.com` jest zablokowany, 4 domeny przechodzą, `pnpm install` i `convex dev --once` działają; pozycje 3, 14 (build), 18, 19 sprawdzone.
4. **explore** (plik 2a „explore”, plik 2 całość). Ukończony, gdy: ticket utworzony przez właściciela dostaje komentarz z planem i `needs-human`; statusy nakładane przez bota dają joby `skipped` bez komentarza; nierozpoznane zdarzenie od właściciela daje komentarz „nic do zrobienia”; zdarzenie od nie-właściciela niczego nie uruchamia; drugi trigger w trakcie runu czeka w `factory-<n>` i kończy się no-opem, gdy trigger zniknął; wymuszony timeout kończy się `agent:blocked`; 13. run na ticket kończy się `needs-human`, a `agent:unlock` zeruje licznik.
5. **implement** (plik 2a „implement”, plik 2 „Dowody”, „`result.json` i sanityzacja”). Ukończony, gdy: `agent:implement` daje gałąź `agent/<n>`, draft PR z `Closes #<n>` i działające linki do dowodów na `agent/evidence-<n>`; zmiana ścieżki z `FACTORY_PROTECTED_PATHS` kończy się `agent:blocked` bez pushu; ponowny implement kontynuuje gałąź fast-forward, a rozjechana gałąź daje `needs-human` bez force-push; komentarze HTML, `@wzmianki` i słowa zamykające z `result.json` nie trafiają do GitHuba; niezgodna wersja Playwright daje `needs-human`; pozycje 11 i 22 sprawdzone.
6. **automated review** (plik 2a „automated review”). Ukończony, gdy: zakończone CI (`success` i `failure`) uruchamia review, a `cancelled` nie; review naprawia czerwone CI; pass zmienia PR na „ready for review” i nakłada `needs-human`; trzeci run bez pass daje `needs-human`; push właściciela na `agent/<n>` zeruje licznik; review starego SHA kończy się no-opem.
7. **decompose / łańcuch** (plik 2a „decompose”, plik 2b „łańcuch”, plik 2 „Grupy `concurrency`”). Ukończony, gdy: spec z `agent:implement-spec` dostaje plan w komentarzu, sub-issues z `blocked_by` i `agent:queued`; w locie jest najwyżej 5 runów agenta; merge PR sub-issue uruchamia zależne; ponowne `agent:implement-spec` dotwarza brakujące pozycje bez runu agenta; „not planned” daje `needs-human` na specu, a po poprawce krawędzi łańcuch rusza dalej; ostatnie zamknięcie zamyka spec z listą PR-ów; joby końcowe nie zakleszczają się z `factory-<n>`; pozycje 5 i 7 sprawdzone.
8. **strażnik** (plik 2b „strażnik”, plik 3a „Reguły strażnika”, „Wyłącznik awaryjny”, „Kanarek”). Ukończony, gdy: przy `FACTORY_GUARD_RUNS_24H` obniżonym testowo do 1 kolejny run agenta zakłada jedno `factory-alert` i wyłącza workflowy agenta, a następne przekroczenie dopisuje komentarz; `setup --enable-agent-workflows` przywraca pracę, a okno liczy się od zamknięcia alertu; próba wyłącznika awaryjnego przechodzi w kolejności z pliku 3a; użycie kanarka wysyła mail do właściciela; pozycja 6 sprawdzona; próg wraca do 60.

**Podgląd `sbx`** (plik 2b „podgląd `sbx`”) jest poza łańcuchem kroków: skrypt powstaje w dowolnym momencie po kroku 5, bo potrzebuje gałęzi `agent/<n>`. Ukończony, gdy: gałąź z PR fabryki działa w przeglądarce hosta na `127.0.0.1:5173`, sandbox nie ma montowań ani sekretów, ruch poza allowlistą jest odrzucany, a `sbx rm -f` usuwa sandbox; pozycje 23 i 24 sprawdzone.

Pozycje 4, 15, 16, 20, 21 i 25 są po budowie: sprawdza je właściciel w eksploatacji.

Źródło: [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)
