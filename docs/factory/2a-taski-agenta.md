# 2a. Taski z agentem

Każdy run tych tasków ma układ 5 jobów (prepare / agent / publish / strażnik / łańcuch) z [2-taski-przeplyw.md](2-taski-przeplyw.md). „Czyta” i „pisze” dotyczą usług: ticket tracker (GitHub Issues) i git host (GitHub). Agent sam niczego nie zapisuje na GitHubie: wszystkie zapisy robi publish z `result.json`.

## explore

Limity: `FACTORY_TIMEOUT_EXPLORE` 30 min, `FACTORY_MAX_TURNS_EXPLORE` 80.

1. **Trigger**: `issues: opened` od właściciela, gdy ticket nie ma `agent:implement` ani `agent:implement-spec`; `agent:explore` od właściciela (ponowny plan); `agent:explore` od bota na sub-issue z `agent:queued` (łańcuch, sub-issue z flagą `explore`).
2. **Robi**: czyta ticket, wcześniejszy plan i komentarze oraz kod; odtwarza problem w uruchomionej aplikacji (lokalny Convex, Chromium z obrazu), a gdy nie odtworzy, mówi to wprost; pisze plan: pliki, podejście, kryteria akceptacji, ryzyka. Nie pushuje. Czyta ticket tracker (zrzut z prepare) i kod (checkout). Pisze przez publish: komentarz z planem i etykiety issue.
3. **Wyzwala dalej**: nic automatycznie; ticket dostaje `needs-human`.
4. **Człowiek wraca**: approve = nałożenie `agent:implement` na issue. Poprawki planu = komentarz + ponowne `agent:explore` (nowy run czyta wcześniejszy plan i komentarze). Porażka = `agent:blocked`, właściciel nakłada trigger ponownie.
5. **Deduplikacja**: grupa `factory-<n>` z `queue: max`; prepare sprawdza, czy trigger nadal wisi, i przejmuje ticket (`agent:in-progress`); prepare zdejmuje `agent:queued`, więc trigger od bota działa raz; licznik 12 runów/ticket.

Źródło: [Taski implement, automated review i explore/plan](https://github.com/jameshopecode/cohort-005-project-widelec/issues/48), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58)

## implement

Limity: `FACTORY_TIMEOUT_IMPLEMENT` 60 min, `FACTORY_MAX_TURNS_IMPLEMENT` 200.

1. **Trigger**: `agent:implement` na issue od właściciela (approve po explore albo ticket utworzony od razu z tą etykietą) albo od bota na sub-issue z `agent:queued` (łańcuch). Gdy issue ma otwarty PR, run robi poprawki na tym PR i czyta komentarze z PR.
2. **Robi**: pracuje na gałęzi `agent/<nr-issue>`: tworzy ją z `main` albo kontynuuje istniejącą. Buduje, aż w runie przejdą automated checks (typy, lint, testy, mutacje). Dla ticketów z UI robi zrzut „przed” (baza PR) i dowody „po” dla każdego kryterium akceptacji; bez UI dowodem są logi i testy. Czyta ticket tracker (issue, komentarze, komentarze PR) i kod. Pisze przez publish: push fast-forward do `agent/<n>`, zrzuty na `agent/evidence-<n>`, draft PR z `Closes #<n>` (pierwszy run) albo komentarz na PR (poprawki), etykiety issue.
3. **Wyzwala dalej**: otwarcie PR (`opened`) albo push na PR (`synchronize`) → CI → `workflow_run` → automated review.
4. **Człowiek wraca**: porażka → `agent:blocked`, właściciel nakłada trigger ponownie; rozjechana gałąź albo limit 12 → `needs-human`; po pass review faza merge; zmiany po review = uwagi na PR + `agent:implement` na issue.
5. **Deduplikacja**: grupa `factory-<n>` z `queue: max`; deterministyczna nazwa gałęzi `agent/<n>`, więc jeden PR na ticket; push tylko fast-forward (fabryka nigdy nie robi force-push); prepare sprawdza trigger i przejmuje ticket; licznik 12.

Źródło: [Taski implement, automated review i explore/plan](https://github.com/jameshopecode/cohort-005-project-widelec/issues/48), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## automated review

Limity: `FACTORY_TIMEOUT_REVIEW` 30 min, `FACTORY_MAX_TURNS_REVIEW` 150.

1. **Trigger**: `workflow_run` CI `completed` na gałęzi `agent/<n>` z wynikiem `success` albo `failure` (YAML review biegnie z `main`); `agent:review` od właściciela na issue z otwartym PR (ręczne review).
2. **Robi**: czyta diff na zimno względem standardów repo i ticketu; sam poprawia kod i commituje; przy czerwonym CI dostaje log porażki i ma go naprawić; weryfikuje w przeglądarce, biorąc „przed” z `agent/evidence-<n>` i robiąc „po” (dla UI dowód wizualny obowiązkowy). Czyta ticket tracker (issue), git host (diff, PR, recenzje, log CI) i kod. Pisze przez publish: push fast-forward poprawek, dowody, jedną recenzję na PR (znaleziska naprawione i nienaprawione + werdykt), a przy pass: PR z draft na „ready for review” + `needs-human` na issue.
3. **Wyzwala dalej**: gdy pushował → `synchronize` → CI → kolejny review ze świeżym kontekstem. **Pass** liczy kod: zielone CI na tym SHA + run niczego nie pushował + dowody; po pass nic automatycznego.
4. **Człowiek wraca**: merge (approval właściciela + squash). Zmiany: uwagi na PR + `agent:implement` na issue albo własne commity właściciela na `agent/<n>` (zerują licznik 3, CI → review rusza samo). Po 3 runach review bez pass: `needs-human`.
5. **Deduplikacja**: grupa `factory-<n>` z `queue: max` (review czeka za implement tego ticketu); grupa `ci-<nr-PR>` z `cancel-in-progress` sprawia, że review budzi tylko CI ostatniego SHA (`cancelled` nie startuje review); prepare sprawdza, że SHA z `workflow_run` jest nadal głową PR, inaczej no-op; licznik 3 runów review.

Źródło: [Taski implement, automated review i explore/plan](https://github.com/jameshopecode/cohort-005-project-widelec/issues/48), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## decompose

Limity: `FACTORY_TIMEOUT_DECOMPOSE` 20 min, `FACTORY_MAX_TURNS_DECOMPOSE` 40, `FACTORY_MAX_SUBISSUES` 12.

Spec właściciel pisze lokalnie (`/to-spec`) i tworzy ticket z `agent:implement-spec`, więc explore przy utworzeniu jest pomijany. Decompose nie przechodzi przez approve (furtka „approve przed łańcuchem” zostaje otwarta).

1. **Trigger**: `issues: labeled` `agent:implement-spec` od właściciela na specu.
2. **Robi**: agent w kontenerze czyta spec i kod, nie uruchamia aplikacji. Zwraca w `result.json` 1–12 ticketów: tytuł, „What”, „Done when”, zależności, flaga `explore` (tylko ticket wymagający eksploracji). Cięcie: jeden ticket = jeden moduł, route na końcu, porządek według zależności, nazwy z glossary; powyżej ~8 ticketów to dwa specy. Publish **najpierw** zapisuje cały plan jako komentarz bota na specu (pozycje 1..N z kluczami nadanymi przez kod), potem tworzy natywne sub-issues z „Spec #X, pozycja k” w treści i natywne krawędzie `blocked_by`, każdy sub-issue z `agent:queued`. Gdy spec ma już plan, prepare nie uruchamia agenta, a publish tylko dotwarza brakujące pozycje i krawędzie. Czyta ticket tracker (spec) i kod. Pisze: komentarz z planem, sub-issues, `blocked_by`, etykiety.
3. **Wyzwala dalej**: łańcuch (job końcowy tego samego runu).
4. **Człowiek wraca**: porażka → `agent:blocked` na specu; właściciel nakłada `agent:implement-spec` ponownie. Plan właściciel poprawia, edytując sub-issues i krawędzie bezpośrednio.
5. **Deduplikacja**: grupa `factory-<nr-speca>` z `queue: max`; plan z kluczami nadanymi przez kod czyni dotwarzanie idempotentnym (sub-issue powstaje tylko dla brakującej pozycji); run liczy się do limitu 12 speca, nie sub-issues.

Źródło: [Łańcuch implement-spec](https://github.com/jameshopecode/cohort-005-project-widelec/issues/51), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Twarde limity kosztu i czasu](https://github.com/jameshopecode/cohort-005-project-widelec/issues/53)
