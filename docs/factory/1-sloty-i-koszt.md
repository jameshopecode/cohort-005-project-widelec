# 1. Sloty usług i koszt

## Sloty

| Slot                   | Produkt                                                                                                                                              | Koszt/mies.              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Ticket tracker         | GitHub Issues: etykiety na issue jako stan, natywne sub-issues i `blocked_by`                                                                        | 0 $ (w GitHub Pro)       |
| Ticket source          | **brak**: tickety pisze tylko właściciel                                                                                                             | 0 $                      |
| Git host               | GitHub, prywatne repo na koncie osobistym z **GitHub Pro** (rulesety, CODEOWNERS i Environments w prywatnym repo)                                    | ~4 $                     |
| Orchestrator           | GitHub Actions: natywne zdarzenia `issues`, `pull_request`, `workflow_run`, `push` + `concurrency`; bez zegara                                       | w minutach runnera       |
| Runner                 | hostowany runner GitHub Actions: `ubuntu-slim` (prepare, publish, CI, joby końcowe), `ubuntu-latest` (job agent w kontenerze, mutacje, build obrazu) | patrz „Koszt miesięczny” |
| Observability platform | **brak**: strony runów Actions wystarczą                                                                                                             | 0 $                      |

Obok slotów:

- **Model**: Claude Code (`claude -p`) na subskrypcji właściciela, token `claude setup-token`. Subskrypcja nie wlicza się do progów kosztu; plan nie jest wybrany, extra usage i auto-reload wyłączone.
- **Obraz kontenera agenta**: prywatny pakiet w GHCR, przypięty po `@sha256:`.
- **Convex w runie**: lokalny backend w trybie anonimowym + `convex-test`, bez żadnego sekretu Convex, 0 $.
- **Lokalny podgląd gałęzi**: Docker Sandboxes (`sbx`) na maszynie właściciela, 0 $ (wymaga konta Docker). To nie runner.
- Canarytokens, `tinyproxy`, iptables: 0 $.

Progi kosztu infrastruktury: do 40 $/mies. OK; 40–100 $ dopuszczalne i oznaczone ⚠️; powyżej 100 $ NO GO.

Źródło: [Wybór runnera](https://github.com/jameshopecode/cohort-005-project-widelec/issues/49), [Wybór orchestratora](https://github.com/jameshopecode/cohort-005-project-widelec/issues/50), [Rozkład sekretów i uprawnień](https://github.com/jameshopecode/cohort-005-project-widelec/issues/52), [Convex w jednorazowym runie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/46), [Subskrypcja Claude w runach bez człowieka](https://github.com/jameshopecode/cohort-005-project-widelec/issues/42), [Budżet minut i tempo fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/59), [Kontener agenta na hostowanym runnerze](https://github.com/jameshopecode/cohort-005-project-widelec/issues/60)

## Stawki i pula

- `ubuntu-slim`: 0,002 $/min, limit 15 min na job, bez Dockera.
- `ubuntu-latest`: 0,006 $/min.
- Każdy job jest zaokrąglany w górę do pełnej minuty.
- Pula GitHub Pro: **18 $/mies.** compute (~3000 min na 2-core), magazyn 1 GB wspólny dla artefaktów i Packages (GHCR), nadwyżka magazynu 0,25 $/GB-mies.
- Miesiąc = 21 dni roboczych. Tempo liczymy w ticketach implementowanych na dzień roboczy.

## Model kosztu ticketu

Szacunek; zastępują go realne czasy runów z pierwszego miesiąca. Ticket = explore + implement + ~1,5 automated review = ~3,5 runu agenta po ~20 min.

| Pozycja                                                          | Runner          | Min/ticket | Arytmetyka                  | $/ticket  |
| ---------------------------------------------------------------- | --------------- | ---------- | --------------------------- | --------- |
| Job agent (~3,5 runu × ~20 min)                                  | `ubuntu-latest` | 70         | 70 × 0,006                  | 0,420     |
| prepare, publish, CI (typecheck, lint, testy)                    | `ubuntu-slim`   | 34         | 34 × 0,002                  | 0,068     |
| CI bez cache: +~2 min `pnpm install` × ~3 przebiegi CI           | `ubuntu-slim`   | 6          | 6 × 0,002                   | 0,012     |
| Joby końcowe strażnik + łańcuch: 2 joby × 1 min × 3,5 runu       | `ubuntu-slim`   | 7          | 7 × 0,002                   | 0,014     |
| Testy mutacyjne, raz na PR (szacunek ~15 min)                    | `ubuntu-latest` | 15         | 15 × 0,006                  | 0,090     |
| Decompose: ~8 min agenta + ~4 min slim na spec, spec ≈ 4 tickety | oba             | 2 + 1      | (8 × 0,006 + 4 × 0,002) / 4 | 0,014     |
| No-opy od statusów bota (job `skipped` na `if:`)                 | —               | 0          | 0                           | 0         |
| **Razem**                                                        |                 |            |                             | **~0,62** |

Koszty stałe miesięcznie (niezależne od liczby ticketów):

- Build obrazu: ~110 s → 2 min `ubuntu-latest` × ~4 buildy/mies. = 8 × 0,006 ≈ **0,05 $**.
- GHCR: ~0,8 GB na wersję obrazu, przy trzymaniu 2 wersji 1,6 GB; ponad 1 GB puli 0,6 GB × 0,25 ≈ **0,15 $**.
- Artefakty (retencja 1 dzień) i cache Actions (nieużywany): 0 $.
- Razem koszty stałe: **~0,20 $**.

Źródło: [Budżet minut i tempo fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/59), [Kontener agenta na hostowanym runnerze](https://github.com/jameshopecode/cohort-005-project-widelec/issues/60), [Twarde limity kosztu i czasu](https://github.com/jameshopecode/cohort-005-project-widelec/issues/53), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58)

## Koszt miesięczny (brutto, z GitHub Pro)

Brutto = GitHub Pro ~4 $ + zużycie Actions ponad pulę 18 $.

| Wariant                        | Tickety/mies.    | Zużycie Actions              | Ponad pulę 18 $   | **Brutto/mies.** | Flaga                         |
| ------------------------------ | ---------------- | ---------------------------- | ----------------- | ---------------- | ----------------------------- |
| Start bez karty                | ~29 (~1,4/dzień) | ≤ 18 $ (cała pula)           | 0 $ (twardy stop) | **~4 $**         | ✅                            |
| 4 tickety/dzień (cel startowy) | 84               | 84 × 0,62 + 0,20 = 52,28 $   | 34,28 $           | **~38 $**        | ✅ (zapas ~2 $ do progu 40 $) |
| 8 ticketów/dzień (sufit)       | 168              | 168 × 0,62 + 0,20 = 104,36 $ | 86,36 $           | **~90 $**        | ⚠️                            |

- **Start bez karty.** Konto nie ma metody płatności: GitHub blokuje Actions po wyczerpaniu puli 18 $, runy padają i kończą się `agent:blocked`. Pojemność puli: (18 − 0,20) / 0,62 ≈ 29 ticketów/mies., czyli ~1,4 ticketu na dzień roboczy. GitHub wysyła mail przy 90% i 100% puli. Celem pierwszego miesiąca są realne czasy runów.
- **Po pierwszym miesiącu** właściciel decyduje o karcie z budżetem Actions i opcją „Stop usage when budget limit is reached” (alerty 75/90/100%). Nowy budżet liczy użycie dopiero od dnia utworzenia.
- **Wrażliwość wariantu 4/dzień**: każda dodatkowa minuta `ubuntu-latest` na ticket to 84 × 0,006 ≈ 0,50 $/mies. Mutacje dłuższe o 15 min (30 zamiast 15) przesuwają wariant do ~46 $ ⚠️.
- **Powyżej 8 ticketów/dzień** fabryka nie rośnie na GitHub Actions (15/dzień: 315 × 0,62 + 0,20 − 18 + 4 ≈ 181 $, NO GO). Jedyną drogą jest ścieżka wyjścia na sandbox E2B, poza tym projektem.

Źródło: [Budżet minut i tempo fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/59), [Twarde limity kosztu i czasu](https://github.com/jameshopecode/cohort-005-project-widelec/issues/53), [Rozkład sekretów i uprawnień](https://github.com/jameshopecode/cohort-005-project-widelec/issues/52), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)
