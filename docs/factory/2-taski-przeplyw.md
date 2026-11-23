# 2. Przepływ: etykiety, zdarzenia, joby, liczniki, `concurrency`

Ten plik opisuje mechanikę wspólną dla wszystkich tasków. Odpowiedzi na 5 pytań dla każdego tasku są w [2a-taski-agenta.md](2a-taski-agenta.md) i [2b-taski-deterministyczne.md](2b-taski-deterministyczne.md).

## Fazy ticketu

1. explore (AFK)
2. approve (HITL): właściciel nakłada `agent:implement`
3. implement (AFK)
4. automated review (AFK)
5. merge (HITL): właściciel zatwierdza i mergeuje PR

Run nigdy nie czeka na człowieka: kończy się zmianą etykiety albo PR-a, a późniejsza zmiana od właściciela wyzwala nowy run. O tym, „co dalej” między runami, decyduje wyłącznie kod deterministyczny (etykiety, `sender`, liczniki, `concurrency`). Agent decyduje tylko wewnątrz runu.

## Etykiety (dokładnie 10, wyłącznie na issue)

Skrypt setupu tworzy je `gh label create --force` i usuwa domyślne etykiety GitHuba. Fabryka używa wyłącznie tych nazw. Etykiety-triggery i statusy wiszą **tylko na issue**; PR pokazuje stan wyłącznie przez draft / ready for review.

| Etykieta               | Rodzaj  | Kolor    | Opis                             | Kto nakłada                                     |
| ---------------------- | ------- | -------- | -------------------------------- | ----------------------------------------------- |
| `agent:explore`        | trigger | `1d76db` | Zbadaj i zaproponuj plan         | właściciel; łańcuch (na issue z `agent:queued`) |
| `agent:implement`      | trigger | `1d76db` | Zbuduj PR                        | właściciel; łańcuch (na issue z `agent:queued`) |
| `agent:implement-spec` | trigger | `1d76db` | Podziel spec i zbuduj łańcuch    | właściciel                                      |
| `agent:review`         | trigger | `1d76db` | Automated review PR              | właściciel                                      |
| `agent:unlock`         | trigger | `1d76db` | Zeruj licznik runów ticketu      | właściciel                                      |
| `agent:in-progress`    | status  | `bfd4f2` | Trwa run fabryki                 | prepare                                         |
| `agent:queued`         | status  | `bfd4f2` | Czeka w łańcuchu implement-spec  | publish decompose                               |
| `agent:blocked`        | status  | `d73a4a` | Powód techniczny, wymaga reakcji | publish (ścieżka porażki)                       |
| `needs-human`          | status  | `fbca04` | Kolej na człowieka               | publish, łańcuch                                |
| `factory-alert`        | alarm   | `b60205` | Alarm strażnika                  | strażnik                                        |

### Maszyna stanów

- **Przejęcie**: prepare zdejmuje etykietę-trigger oraz `agent:queued`, `needs-human` i `agent:blocked`, i nakłada `agent:in-progress`.
- **Koniec explore**: `agent:in-progress` → `needs-human` (plan do zatwierdzenia).
- **Koniec implement**: `agent:in-progress` zdjęte, draft PR otwarty; dalej CI → review.
- **Koniec review**: pass → PR „ready for review” + `needs-human`; bez pass i z pushem → bez etykiety, dalej CI → review; 3 runy review bez pass → `needs-human`.
- **Porażka runu** (crash, timeout, `error_max_turns`, limit subskrypcji Claude, wyczerpana pula Actions, bundle dotykający `FACTORY_PROTECTED_PATHS`): `agent:in-progress` → `agent:blocked` + komentarz z linkiem do runu. Fabryka nie ponawia sama: właściciel nakłada trigger ponownie.
- **Rozjechana gałąź** (push `agent/<n>` nie jest fast-forward): porażka runu + `needs-human`. Fabryka nigdy nie robi force-push.
- **Limit 12 runów/ticket przekroczony**: `needs-human`, kolejne triggery ignorowane z komentarzem, dopóki właściciel nie nałoży `agent:unlock`.
- **Spec**: w trakcie łańcucha bez etykiety statusu (postęp pokazuje pasek sub-issues); `agent:blocked` przy porażce decompose; `needs-human` przy sub-issue „not planned”.

Źródło: [Taski implement, automated review i explore/plan](https://github.com/jameshopecode/cohort-005-project-widelec/issues/48), [Konfiguracja git hosta i ticket trackera pod fabrykę](https://github.com/jameshopecode/cohort-005-project-widelec/issues/55), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## Mapa zdarzeń

| Zdarzenie                                                        | Warunek                                                                         | Run                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| `issues: opened`                                                 | sender = `FACTORY_OWNER`, ticket bez `agent:implement` / `agent:implement-spec` | explore                                            |
| `issues: labeled` `agent:explore` / `agent:implement`            | sender = `FACTORY_OWNER` **albo** bramka AFK (niżej) i issue ma `agent:queued`  | explore / implement (poprawki na PR, gdy istnieje) |
| `issues: labeled` `agent:review`                                 | sender = `FACTORY_OWNER`, issue ma otwarty PR                                   | automated review                                   |
| `issues: labeled` `agent:implement-spec`                         | sender = `FACTORY_OWNER`                                                        | decompose albo dotworzenie planu                   |
| `issues: labeled` `agent:unlock`                                 | sender = `FACTORY_OWNER`                                                        | brak runu; zeruje licznik 12/ticket                |
| `pull_request` `opened`, `synchronize` do `main`                 | —                                                                               | CI (mutacje tylko przy `opened`)                   |
| `workflow_run` CI `completed`, gałąź `agent/<n>`                 | wynik `success` albo `failure`                                                  | automated review                                   |
| `issues: closed` sub-issue speca                                 | —                                                                               | łańcuch                                            |
| koniec każdego workflowu agenta                                  | `needs: publish`, `if: always()`                                                | strażnik, potem łańcuch (joby końcowe)             |
| `push`                                                           | —                                                                               | strażnik                                           |
| `push` na `main` zmieniający katalog obrazu; `workflow_dispatch` | —                                                                               | build obrazu                                       |

- **Bramka AFK**: `github.event.sender.type == "Bot"` i `github.event.sender.login == "<slug>[bot]"`. Dosłowną wartość sprawdza się przy budowie (plik 4).
- **Statusy nakładane przez bota** (`agent:in-progress`, `agent:queued`, `agent:blocked`, `needs-human`, `factory-alert`) i `issues: opened` od bota odpadają na `if:` na poziomie joba: job `skipped` = 0 minut, bez komentarza.
- **Nierozpoznane zdarzenie od właściciela** kończy się no-opem z komentarzem „nic do zrobienia”.
- `workflow_run` jest użyty tylko na odcinku CI → review (1 poziom; limit GitHuba to 3). Wynik `cancelled` (CI zastąpione nowszym pushem) nie startuje review.
- Tabela wyżej to pełna lista triggerów fabryki. `workflow_dispatch` służy tylko buildowi obrazu i debugowaniu.

Źródło: [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Fakty GitHub Actions dla łańcucha zdarzeń fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/57), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## Układ jobów runu agenta

Każdy workflow agenta (explore, implement, review, decompose) ma `run-name: factory-<nr-issue>-<task>` i pięć jobów, każdy na osobnej świeżej VM:

| Job          | Runner, `timeout-minutes`                           | Environment      | Tokeny                                                                                                       | Robi                                                                                                                                                                                                                                     |
| ------------ | --------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **prepare**  | `ubuntu-slim`, 10                                   | `factory-github` | token App (`issues: write`, `pull_requests: write`, `contents: read`); `GITHUB_TOKEN` `actions: read`        | `sender` i bramka AFK; czy trigger nadal obowiązuje; liczniki; wersja Playwright z `package.json` gałęzi vs wersja w obrazie (niezgodność → `needs-human`); przejęcie; zrzut ticketu, komentarzy, diffu, recenzji i dowodów do artefaktu |
| **agent**    | `ubuntu-latest`, `FACTORY_TIMEOUT_<TASK>`           | `factory-agent`  | token Claude + kanarek tylko w kontenerze; poza kontenerem `GITHUB_TOKEN` `contents: read`, `packages: read` | checkout, `.claude/` podmienione na wersję z `main`, pull obrazu po digeście, kontener (plik 3a), `claude -p --max-turns`; wynik: `result.json` + `git bundle` jako artefakt                                                             |
| **publish**  | `ubuntu-slim`, 10, `if: always()`                   | `factory-github` | token App (`contents: write`, `issues: write`, `pull_requests: write`)                                       | artefakty jako niezaufane dane; odrzuca zmiany `FACTORY_PROTECTED_PATHS`; sanityzacja; push fast-forward wyłącznie do `agent/<n>`; dowody; komentarz / recenzja / draft PR; werdykt pass; etykiety; ścieżka porażki                      |
| **strażnik** | `ubuntu-slim`, 5, `needs: publish`, `if: always()`  | —                | `GITHUB_TOKEN` `actions: write`, `issues: write`                                                             | reguły strażnika (plik 3a)                                                                                                                                                                                                               |
| **łańcuch**  | `ubuntu-slim`, 5, `needs: strażnik`, `if: always()` | `factory-github` | token App tylko `issues: write`                                                                              | frontier i dobór do limitu (plik 2b)                                                                                                                                                                                                     |

- Token App ma tylko publish, łańcuch i prepare. Klucz i token App nigdy nie trafiają na VM joba agent.
- Token App wybija `actions/create-github-app-token@v3` (przypięte do SHA) z wąskimi `permission-*` i `repositories` = to jedno repo; żyje 1 h i jest unieważniany na końcu joba.
- Artefakty służą tylko do przekazania między jobami, retencja 1 dzień.
- Żaden job fabryki nie przywraca ani nie zapisuje cache Actions (plik 3).

### `result.json` i sanityzacja

Agent kończy plikiem `result.json`: `outcome` (done / blocked), powód, treść komentarza lub recenzji, ścieżki dowodów, a w decompose lista ticketów. Publish przed publikacją tokenem App:

- usuwa komentarze HTML (`<!-- -->`) i `@wzmianki`;
- neutralizuje słowa zamykające (`Closes/Fixes/Resolves #n` → kod inline); `Closes #<n>` w PR wstawia kod;
- przycina treść do ~20 KB;
- przepuszcza linki tylko do `github.com/<repo>` (w tym dowody na `agent/evidence-<n>`).

Etykiety i werdykt pass wynikają wyłącznie z pól enum i warunków liczonych przez kod, nigdy z tekstu.

### Dowody

- Jedyna metoda: gałąź `agent/evidence-<n>`. Publish commituje zrzuty tokenem App i osadza je w komentarzu jako `![](https://github.com/<repo>/blob/<sha>/<plik>?raw=true)`. Wideo tylko jako link.
- Zrzut „przed” (baza PR, tylko tickety z UI) robi wyłącznie implement. Review bierze „przed” z `agent/evidence-<n>`, a „po” robi sam.
- Gałęzi dowodów nie usuwa się (ruleset `evidence`); usuwa je tylko wyłącznik awaryjny, co psuje linki.

Źródło: [Rozkład sekretów i uprawnień](https://github.com/jameshopecode/cohort-005-project-widelec/issues/52), [Wybór orchestratora](https://github.com/jameshopecode/cohort-005-project-widelec/issues/50), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Twarde limity kosztu i czasu](https://github.com/jameshopecode/cohort-005-project-widelec/issues/53), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## Liczniki

Źródłem jest **API Actions** (`GITHUB_TOKEN` `actions: read` w prepare), nie markery w komentarzach. Liczy się run, w którym **wystartował job `agent`**; no-opy i porażki prepare się nie liczą.

| Licznik                       | Zmienna                       | Wartość | Liczone od                                                                                                     | Po przekroczeniu                                 |
| ----------------------------- | ----------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Runy na ticket                | `FACTORY_MAX_RUNS_PER_TICKET` | 12      | ostatniego `agent:unlock` od właściciela (timeline issue); issue i jego PR razem; decompose liczy się do speca | `needs-human`, triggery ignorowane z komentarzem |
| Runy review na PR             | `FACTORY_MAX_REVIEW_RUNS`     | 3       | ostatniej etykiety-triggera od właściciela na issue **albo** ostatniego pushu właściciela na `agent/<n>`       | `needs-human`                                    |
| Runy agenta w 24 h (strażnik) | `FACTORY_GUARD_RUNS_24H`      | 60      | max(24 h temu, zamknięcie ostatniego `factory-alert`); workflowy z `FACTORY_AGENT_WORKFLOWS`                   | alert + wyłączenie workflowów agenta             |

`agent:unlock` nie startuje runu. Push właściciela na `agent/<n>` liczy się jako trigger właściciela: CI → review rusza automatycznie z wyzerowanym licznikiem 3.

## Grupy `concurrency`

| Grupa                | Poziom   | Tryb                                           | Kto                                                                              |
| -------------------- | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `factory-<nr-issue>` | workflow | `queue: max`, `cancel-in-progress: false`      | explore, implement, review (numer z gałęzi `agent/<n>`), decompose (numer speca) |
| `factory-chain`      | job      | domyślny (nowszy oczekujący zastępuje starszy) | job łańcucha                                                                     |
| `factory-guard`      | job      | domyślny                                       | job strażnika                                                                    |
| `ci-<nr-PR>`         | workflow | `cancel-in-progress: true`                     | CI                                                                               |
| `factory-image`      | workflow | `cancel-in-progress: true`                     | build obrazu                                                                     |

- `factory-<n>`: FIFO do 100 oczekujących, review czeka za implement, nic nie anuluje oczekującego. Każdy run po starcie sprawdza w prepare, czy trigger nadal obowiązuje; jeśli nie, no-op.
- **Zagnieżdżenie**: joby końcowe stoją w `factory-chain` / `factory-guard`, trzymając przez cały ten czas `factory-<n>` swojego workflowu. Zakleszczenia nie ma, bo żaden z nich nie potrzebuje cudzej grupy `factory-<m>`: łańcuch tylko nakłada etykiety, a runy, które te etykiety wyzwalają, czekają we własnych `factory-<m>`. Oczekujący job zastąpiony przez nowszy kończy się `cancelled`, bez skutków: oba joby są idempotentne, a nowszy przelicza stan od zera. Kosztem jest dłuższe trzymanie `factory-<n>`: kolejny run tego ticketu startuje dopiero po jobach końcowych.

Źródło: [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Fakty GitHub Actions dla łańcucha zdarzeń fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/57), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)
