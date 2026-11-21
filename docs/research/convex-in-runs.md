# Convex w jednorazowym runie

Ticket: [#46](https://github.com/jameshopecode/cohort-005-project-widelec/issues/46) (mapa [#41](https://github.com/jameshopecode/cohort-005-project-widelec/issues/41)).
Stan źródeł na 2026-11-21. Słownictwo: skill `software-factory` (task, run, runner, git host, orchestrator).

## Pytanie

Jak run na jednorazowym runnerze może uruchomić aplikację React Router + Convex i jej testy, nie dotykając produkcji? Które drogi wymagają sekretu na runnerze i ile kosztują?

## Odpowiedź w skrócie

**Domyślnie: lokalny backend Convex w trybie anonimowym, bez żadnego sekretu Convex na runnerze.** CLI `convex` samo pobiera binarkę open-source backendu z GitHub Releases, uruchamia ją jako podproces i zapisuje URL do `.env.local`. Nie potrzeba konta, logowania ani deploy key, a produkcja jest nieosiągalna, bo na runnerze nie ma żadnego klucza do chmury. Koszt: 0 $.

Do tego `convex-test` (mock w JS, w Vitest) dla szybkich testów logiki funkcji, również bez sekretu.

Drogi chmurowe (preview deployment, dev deployment per run) wymagają sekretu na runnerze. Są potrzebne dopiero, gdy run musi mieć publiczny URL (webhooki), domyślne env vars projektu, crony w chmurze albo integracje dostępne tylko w chmurze. Jeśli kiedyś będą potrzebne, lepszy jest **preview deploy key** niż project token.

## Drogi

### 1. Lokalny backend, tryb anonimowy (rekomendowane)

**Jak działa**

- Bez konta: „You can develop without a Convex account” ([Local deployments](https://docs.convex.dev/cli/local-deployments)). Stan leży w `.convex/` w katalogu projektu. Backend „runs as a subprocess of the `npx convex dev` command and exits when that command is stopped”. To pasuje do runnera: nic nie przeżywa runu.
- W powłoce nieinteraktywnej CLI samo wybiera lokalny deployment, gdy nic nie jest skonfigurowane i `CONVEX_DEPLOY_KEY` nie jest ustawiony ([Agent mode](https://docs.convex.dev/cli/agent-mode)). Kod CLI wybiera tryb anonimowy, gdy `!isLoggedIn || process.env.CONVEX_AGENT_MODE === "anonymous" || !process.stdin.isTTY` i nie jest wyłączony przez `CONVEX_ALLOW_ANONYMOUS=false` ([deploymentSelection.ts](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/cli/lib/deploymentSelection.ts)).
- Docs rekomendują tę drogę dla agentów: „Best for ephemeral agents that don't require webhooks or default environment variables” ([Agent mode](https://docs.convex.dev/cli/agent-mode)).
- Uwaga: CLI przerywa pracę, gdy nie znajdzie konfiguracji w środowisku buildu. Sprawdza tylko `VERCEL`, `NETLIFY`, `CF_PAGES` i `WORKERS_CI` ([envvars.ts](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/cli/lib/envvars.ts)), więc runner GitHub Actions ani zwykły VM tego nie wyzwala.
- Flaga `convex dev --local` z treści ticketu nie występuje w obecnych docs. Docs opisują wybór przez `npx convex deployment select local` albo automatyczny fallback opisany wyżej.

**Wymagania runnera**

- Dostęp do sieci przy pierwszym uruchomieniu. CLI pyta `https://version.convex.dev/v1/local_backend_version`, a potem pobiera `https://github.com/convex/convex-backend/releases/download/<wersja>/<plik>` ([download.ts](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/cli/lib/localDeployment/download.ts)). Agent mode też mówi, że skrypt setupu potrzebuje „full” dostępu do internetu za pierwszym razem. Binarkę można cache'ować między runami, bo jest wersjonowana w katalogu, a CLI używa jej ponownie, jeśli istnieje.
- Platformy: binarki dla linux x64 i arm64, macOS x64 i arm64 oraz Windows x64. Najnowszy release to `precompiled-2026-11-21-cf39368` z 2026-11-21 ([releases](https://github.com/get-convex/convex-backend/releases)). README backendu mówi, że jest „battle tested most thoroughly on Linux and Mac”.
- Akcje Node.js używają `node` z PATH, który musi być w wersji wspieranej przez Convex ([Local deployments](https://docs.convex.dev/cli/local-deployments)).
- Licencja: FSL-1.1-Apache-2.0, a każda wersja przechodzi na Apache 2.0 po dwóch latach ([LICENSE.md](https://github.com/get-convex/convex-backend/blob/main/LICENSE.md)). Zakazane jest tylko „competing use”, czyli oferowanie konkurencyjnej usługi. Użycie wewnętrzne w fabryce jest dozwolone.

**Ograniczenia** ([Local deployments](https://docs.convex.dev/cli/local-deployments), [Agent mode](https://docs.convex.dev/cli/agent-mode))

- Brak publicznego URL, więc nie zadziałają webhooki przychodzące (np. Clerk, Stripe, Twilio).
- Brak domyślnych env vars projektu. Run musi je ustawić sam (`npx convex env set ...` przed `npx convex dev --once`), co oznacza, że klucze do zewnętrznych API, których potrzebują akcje, trafiłyby na runner. Testy powinny je mockować albo używać kluczy testowych.
- Akcje Node mają nieograniczony dostęp do systemu plików runnera. Przy jednorazowym runnerze to akceptowalne.
- AI Gateway Convex nadal idzie przez chmurę i jest rozliczane na zespół połączonego projektu. Docs nie mówią, co się dzieje w trybie anonimowym bez połączonego projektu. Moje przypuszczenie (niezweryfikowane): te wywołania nie zadziałają.
- Wiele klonów z tym samym `CONVEX_DEPLOYMENT` się gryzie ([convex-backend#288](https://github.com/convex/convex-backend/issues/288)). Na jednorazowym runnerze z jednym checkoutem to nie problem.

**Ryzyko izolacji.** CLI ustala, w który deployment celuje, w kolejności: `CONVEX_DEPLOY_KEY`, potem `CONVEX_SELF_HOSTED_*`, potem `CONVEX_DEPLOYMENT`, a tryb anonimowy dopiero na końcu ([deploymentSelection.ts](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/src/cli/lib/deploymentSelection.ts)). `CONVEX_AGENT_MODE=anonymous` nie jest więc barierą bezpieczeństwa. Izolację daje wyłącznie brak klucza chmurowego w środowisku runu. Wniosek dla fabryki: na runnerze **nie** może być `CONVEX_DEPLOY_KEY` ani zalogowanego `~/.convex`.

**Jak z tego korzystają testy**

- Szybka warstwa: `convex-test`, „a mock implementation of the Convex backend in JavaScript” w Vitest. Nie potrzebuje backendu. Ograniczenia: inny runtime, brak egzekwowania limitów, uproszczone wyszukiwanie i brak cronów ([convex-test](https://docs.convex.dev/testing/convex-test)).
- Wierna warstwa: testy na lokalnym backendzie, gdzie limity są egzekwowane, a crony i scheduler działają naprawdę. Fetch i env vars nie dają się mockować z poziomu testu, a testy trzeba serializować i czyścić stan mutacją dostępną tylko w testach, chronioną przez `IS_TEST` ([Testing Local Backend](https://docs.convex.dev/testing/convex-backend), [Stack: testing with local OSS backend](https://stack.convex.dev/testing-with-local-oss-backend), artykuł bez daty).
- Aplikacja React Router (dev server lub e2e) czyta URL backendu z `.env.local`, który CLI zapisuje (`CONVEX_URL` i `CONVEX_SITE_URL`). Mapowanie na `VITE_CONVEX_URL` ustawia sam projekt.

**Sekret na runnerze: brak.**

### 2. Self-hosted backend (Docker)

To ta sama binarka open-source, tylko w Dockerze, z dashboardem na porcie 6791 i API na 3210/3211 ([self-hosted README](https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md)). CLI łączy się przez `CONVEX_SELF_HOSTED_URL` i `CONVEX_SELF_HOSTED_ADMIN_KEY`. Admin key generuje się w kontenerze (`generate_admin_key.sh`). Według [Deploy key types](https://docs.convex.dev/cli/deploy-key-types) admin key daje „complete control over a deployment” i jest „an irrevocable secret”.

W jednorazowym runie to tylko droga 1 z dodatkowymi krokami (Docker, generowanie klucza). Admin key powstaje w runie i ginie razem z runnerem, więc nie jest sekretem dostarczanym z zewnątrz. Ma sens tylko wtedy, gdy runner i tak opiera się na Dockerze (np. docker compose z innymi usługami). Długo żyjący self-hosted serwer współdzielony przez runy łamie zasadę jednorazowego runnera i wymaga dzielenia nieodwoływalnego admin key, więc odradzam.

**Sekret na runnerze: brak z zewnątrz** (klucz powstaje i umiera w runie).

### 3. Preview deployment w chmurze (preview deploy key)

- `npx convex deploy` z `CONVEX_DEPLOY_KEY` ustawionym na preview deploy key tworzy albo ponownie używa preview deploymentu o danej nazwie (`--preview-name`). `--preview-create` za każdym razem go usuwa i tworzy od nowa. `--preview-run=<fn>` seeduje dane. Na GitHub Actions nazwa wynika z gałęzi ([Preview deployments](https://docs.convex.dev/production/hosting/preview-deployments)).
- Preview deployment jest automatycznie usuwany po 5 dniach (na Free i Starter) albo po 14 dniach (od Professional). To funkcja beta, a każdy preview liczy się do limitu deploymentów zespołu ([Multiple deployments](https://docs.convex.dev/production/multiple-deployments)).
- Zakres klucza: preview deploy key (`preview:team-slug:project-slug|...`) obejmuje preview deploymenty **całego projektu**, a nie jeden deployment ([Deploy key types](https://docs.convex.dev/cli/deploy-key-types)). Docs nie mówią wprost, że nie sięga produkcji ani deploymentów dev. Z formatu i opisu wynika, że deployuje tylko do previews, ale nie zweryfikowałem tego empirycznie. Skompromitowany run z tym kluczem może nadpisać lub usunąć preview innej gałęzi (przez `--preview-create` z cudzą nazwą). Docs nie opisują ochrony przed tym.
- Unieważnianie: przez dashboard (Deploy keys, potem delete) albo `npx convex deployment token delete '<key>'` ([Deploy key types](https://docs.convex.dev/cli/deploy-key-types)). Działa od razu w tym sensie, że klucz przestaje istnieć. Docs nie podają SLA propagacji.
- Wygasanie: tokeny deploymentów mają `--expiration` ([Multiple deployments](https://docs.convex.dev/production/multiple-deployments)). Docs nie potwierdzają tej opcji dla preview keys.

**Sekret na runnerze: tak** (preview deploy key, długo żyjący, zakres: wszystkie previews projektu).

### 4. Dev deployment per run (deployment-scoped dev key)

- `npx convex deployment create --type dev --select` tworzy deployment, a `npx convex deployment token create agent-token --save-env` mintuje klucz ograniczony do niego. „The agent can only push to and develop against its own dev deployment” ([Agent mode](https://docs.convex.dev/cli/agent-mode)). Klucz typu `dev:...` daje pełny dostęp do jednego deploymentu, można mu dać `--expiration` i usuwa się go jak inne klucze ([Deploy key types](https://docs.convex.dev/cli/deploy-key-types), [Multiple deployments](https://docs.convex.dev/production/multiple-deployments)).
- Haczyk: **utworzenie** deploymentu i zmintowanie klucza wymaga uprawnień na poziomie projektu (zalogowany CLI albo project token, który daje „total control over the project”, łącznie z produkcją) ([Deploy key types](https://docs.convex.dev/cli/deploy-key-types)). Docs nie opisują osobnego unieważniania project tokenu. Ten krok nie może więc działać na runnerze. Musiałby go wykonać orchestrator (albo właściciel) i przekazać runowi tylko klucz `dev:...` z krótkim `--expiration`. Do tego dochodzi sprzątanie deploymentów, bo dev deploymenty nie mają auto-cleanup jak previews, a limit to 40 deploymentów na Free/Starter.

**Sekret na runnerze: tak** (klucz jednego deploymentu, krótko żyjący). Wymaga też project tokenu poza runnerem, w orchestratorze.

## Koszt w planie Convex ([Pricing](https://www.convex.dev/pricing), [Limits](https://docs.convex.dev/production/state/limits))

| Droga                  | Koszt infrastruktury | Uwagi                                                                                                                                                                                                 |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Lokalny anonimowy   | 0 $                  | Zero użycia chmury Convex.                                                                                                                                                                            |
| 2. Self-hosted w runie | 0 $                  | j.w.                                                                                                                                                                                                  |
| 3. Preview             | 0 $ ponad plan       | Previews „Included” na każdym planie, również Free/Starter (0 $, pay-as-you-go po przekroczeniu limitów). Zużycie (1M wywołań funkcji, 0,5 GB bazy, 1 GB I/O na Free) dzieli się z produkcją zespołu. |
| 4. Dev per run         | 0 $ ponad plan       | j.w. Limit 40 deploymentów na Free/Starter, 300 na Professional (25 $ za dewelopera miesięcznie).                                                                                                     |

Wszystkie drogi mieszczą się w progu ≤40 $/mies. Ryzyko kosztowe dróg 3 i 4: runy zużywają wspólny limit z produkcją, a po jego przekroczeniu Starter dolicza opłaty według zużycia. Ten koszt trzeba ograniczyć po stronie Convex (temat dla „Hamulce w pętlach” na mapie).

## Która droga wymaga sekretu na runnerze

| Droga                  | Sekret Convex na runnerze                                                  | Czy sięga produkcji?               |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| 1. Lokalny anonimowy   | nie                                                                        | nie (brak klucza chmurowego)       |
| 2. Self-hosted w runie | nie (admin key powstaje lokalnie)                                          | nie                                |
| 3. Preview             | tak: preview deploy key (wszystkie previews projektu)                      | według docs nie, nie zweryfikowano |
| 4. Dev per run         | tak: klucz `dev:` jednego deploymentu, plus project token w orchestratorze | klucz runu nie; project token tak  |

## Rekomendacja dla fabryki

1. Automated checks i testy w runie: `convex-test` plus lokalny backend w trybie anonimowym. Na runnerze nie ma żadnego sekretu Convex. Środowisko runu musi gwarantować brak `CONVEX_DEPLOY_KEY`, `CONVEX_SELF_HOSTED_*` i loginu Convex, bo te mają pierwszeństwo przed trybem anonimowym.
2. Cache binarki lokalnego backendu (katalog wersjonowany przez CLI) przyspiesza runy, ale nie jest wymagany.
3. Preview deploymenty dla PR (podgląd dla human review) można dodać później jako osobny krok poza runem agenta, np. w automated checks na git hoście z preview deploy key w sekretach repo, niedostępnych dla runu. To decyzja dla „Rozkład sekretów i uprawnień”.
4. Nie używać project tokenu ani logowania Convex na runnerze.

## Otwarte / do weryfikacji

- Czy preview deploy key rzeczywiście nie może wykonać żadnej operacji na produkcji ani deploymentach dev (docs tego nie mówią wprost). Do sprawdzenia empirycznie przed użyciem drogi 3.
- Czy preview deploy keys wspierają `--expiration`.
- Jak szybko unieważnienie klucza działa na już otwarte połączenia (docs milczą).
