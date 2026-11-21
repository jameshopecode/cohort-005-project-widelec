# Opcje orchestratora i orkiestracja deterministyczna vs agentowa

Research do ticketu [#44](https://github.com/jameshopecode/cohort-005-project-widelec/issues/44) (mapa [#41](https://github.com/jameshopecode/cohort-005-project-widelec/issues/41)). Stan na 2026-11-21. Słownictwo: skill `software-factory` (task, trigger, run, runner, ticket tracker, git host, orchestrator).

## Krótka odpowiedź

- **Orchestrator: GitHub Actions** pasuje najlepiej. Triggery z GitHuba są wbudowane, sekrety leżą w repo, koszt to 0 $ przy self-hosted runnerze albo w ramach 12–18 $ kredytu na planie Free/Pro. `concurrency` daje deduplikację per ticket/PR. Kodu jest najmniej: kilka plików YAML.
- **Scheduled tasks (dawniej routines) Claude Code** to realna alternatywa „zero infrastruktury” dla tasków read-only/review: mają triggery GitHub/cron/API i chodzą na subskrypcji. Mają jednak słabości: status research preview, brak kontroli deduplikacji, zdarzenia ponad godzinny limit przepadają, a PR-y i commity podpisuje tożsamość właściciela.
- **Inngest, Trigger.dev i Temporal** dają lepsze prymitywy (idempotencja, klucze współbieżności, kolejki). Każdy z nich oznacza jednak dodatkowe konto, hosting kodu i webhook z GitHuba. Na naszą skalę to nadmiar.
- **Własny serwer + SQLite** to najwięcej kodu i utrzymania. Ma sens tylko wtedy, gdy ticket tracker nie jest na GitHubie.
- **„Co dalej?” rozstrzyga deterministyczny kod** (etykiety, stany, `concurrency`), a run agenta podejmuje decyzje tylko _wewnątrz_ tasku. Każdy run startuje z czystym kontekstem i kończy się zmianą w ticket trackerze albo na git hoście. To rozwiązuje obawę przed przeładowaniem kontekstu orchestratora: orchestrator nie jest agentem i nie ma kontekstu.

## Tabela porównawcza

| Opcja                                       | Triggery                                                                                                                                             | Deduplikacja / równoległość                                                                                                                                                                                                                                                        | Sekrety                                                                                                                    | Koszt przy naszej skali                                                                                                                     | Utrzymanie                                                   | Ile kodu                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| **GitHub Actions** (eventy + `concurrency`) | Natywnie wszystkie eventy GitHuba (issues, labels, PR, komentarze), `schedule` (cron), `workflow_dispatch`/`repository_dispatch` (inne runy)         | `concurrency.group` (np. `ticket-${{ github.event.issue.number }}`): max 1 działający run w grupie; `queue: single` (domyślnie, 1 oczekujący, nowszy zastępuje starszy) albo `queue: max` (do 100 w FIFO); `cancel-in-progress`. Free: 20 równoległych jobów, Pro: 40. Job max 6 h | GitHub Secrets (repo/env); `CLAUDE_CODE_OAUTH_TOKEN` z `claude setup-token`                                                | Hosted Linux 0,006 $/min; kredyt 12 $ (Free) / 18 $ (Pro) ≈ 2000/3000 min. Self-hosted: 0 $                                                 | Brak (SaaS); YAML w repo                                     | Kilka plików YAML + prompty                         |
| **Scheduled tasks / routines Claude Code**  | Schedule (cron, min. co godzinę, albo jednorazowo), GitHub events (PR, release, issue: opened/labeled/…, z filtrami), API (`/fire` z bearer tokenem) | Brak kluczy deduplikacji; „dwie aktualizacje PR = dwie niezależne sesje”. Limity: 100 runów z harmonogramu na godzinę na konto, 30 runów `/fire`/Run now na godzinę na task; nadmiarowe eventy GitHuba **przepadają**. Limit sesji chmurowych naraz w organizacji                  | Cloud environment: zmienne env (widoczne dla użytkowników środowiska) albo „network secrets”; tożsamość GitHub właściciela | 0 $ infrastruktury; zużywa subskrypcję                                                                                                      | Brak; ale research preview: API i limity mogą się zmienić    | Konfiguracja w UI/`/schedule` + prompt; zero YAML   |
| **Inngest**                                 | Eventy (HTTP/SDK), webhooki z transformacją (np. z GitHuba), cron, `step.invoke` innych funkcji                                                      | Najlepsze prymitywy: event `id` deduplikowany przez 24 h, `idempotency` (CEL) per funkcja, `concurrency` z kluczem (np. per ticket), debounce, throttling, rate limit                                                                                                              | Inngest signing/event key + sekrety w _Twojej_ aplikacji, bo funkcje wykonują się u Ciebie (`serve()`/`connect()`)         | Free 0 $: 50k wykonań/mies., 5 równoległych kroków. Pro od 99 $/mies. (**na granicy NO GO**)                                                | Konto + hosting endpointu z kodem funkcji + runner osobno    | Aplikacja TS z funkcjami + webhook GitHub + runner  |
| **Trigger.dev**                             | Wywołania z SDK/API, schedules (Free: 10), wywołania z innych tasków; webhook GitHuba trzeba odebrać samemu                                          | Idempotency keys (domyślnie TTL 30 dni; scope `run`/`attempt`/`global`), `concurrencyKey` per wartość; domyślnie współbieżność bez limitu do limitu środowiska (Free: 20 równoległych runów)                                                                                       | Env vars w Trigger.dev; kod tasków działa na ich maszynach                                                                 | Free 0 $ (5 $ kredytu na compute, potem stop); Hobby 10 $/mies. (10 $ kredytu, 50 równoległych runów); compute np. 0,0000338 $/s (0,5 vCPU) | Konto + deploy tasków + odbiornik webhooka                   | Projekt TS z taskami + endpoint webhooka            |
| **Temporal**                                | Start z kodu (klient), Schedules, child workflows; brak natywnych eventów GitHuba                                                                    | Workflow ID = klucz deduplikacji: max 1 otwarta egzekucja na ID; polityki reuse/conflict (`Reject Duplicate`, `Use Existing`)                                                                                                                                                      | Własne workery trzymają sekrety                                                                                            | Cloud pay-as-you-go: 0 $ bazowo, 50 $/1M akcji (+10% za support); self-hosted 0 $ licencji, ale serwer + baza                               | Najcięższe: workery zawsze włączone, serwer albo konto Cloud | Workflow + activities + worker + odbiornik webhooka |
| **Własny serwer + SQLite**                  | Co napiszesz: webhook GitHuba, cron, wywołania z runów                                                                                               | Co napiszesz: tabela runów z unikalnym kluczem (ticket, task), własna kolejka                                                                                                                                                                                                      | Na serwerze (env/plik), który staje się celem ataku                                                                        | VPS od ~5,49 €/mies. (Hetzner)                                                                                                              | Patchowanie OS, backup, monitoring, TLS                      | Najwięcej: serwer, kolejka, retry, UI statusu       |

### Komentarz do opcji

**GitHub Actions.** GitHub jest już ticket trackerem i git hostem, więc trigger nie wymaga żadnego dodatkowego elementu. Jest jedna pułapka przy łańcuchach runów: zdarzenia wywołane przez `GITHUB_TOKEN` nie tworzą nowych runów workflow (wyjątki to `workflow_dispatch` i `repository_dispatch`). Jeśli run implement ma np. nałożyć etykietę, która uruchomi automated review, musi użyć tokenu GitHub App, albo orchestrator musi wywołać kolejny run przez `workflow_dispatch`. To zbiega się z otwartym punktem mapy o GitHub App. Domyślne `queue: single` _anuluje_ poprzedni oczekujący run w grupie. Dla tasku per ticket to pożądana deduplikacja, ale dla kolejki „wszystkie tickety po kolei” trzeba ustawić `queue: max`. Runner to osobny slot: hosted runner albo self-hosted.

**Scheduled tasks Claude Code.** To jedyna opcja, w której orchestrator i runner są w jednym produkcie i nic nie trzeba hostować. Ryzyka dla naszego modelu zagrożeń:

- runy działają jako właściciel („Commits and pull requests carry your GitHub user”);
- reguły branch protection, które ta tożsamość może obejść, nie blokują pusha z runu, więc `main` musi być chroniony regułą bez bypassu dla właściciela;
- auto mode może zatrzymać run na prośbie o zgodę, co łamie zasadę „run nigdy nie czeka na człowieka”;
- przy przekroczeniu limitów eventy GitHuba są gubione, a nie kolejkowane.

Dobrze nadaje się na start do tasków explore/plan albo automated review, gorzej jako jedyny orchestrator.

**Inngest / Trigger.dev / Temporal.** Ich mocne strony to trwałe wykonanie, retry kroków, debounce i idempotencja. Te mechanizmy mają znaczenie przy tysiącach zdarzeń albo wielogodzinnych przepływach z oczekiwaniem. U nas run jest czarną skrzynką kończącą się zmianą na GitHubie, a stan i tak żyje w ticket trackerze i na git hoście, więc te prymitywy duplikują to, co daje `concurrency` + etykiety. Każda z tych opcji dodaje konto, sekrety i element do utrzymania, a nadal wymaga osobnego runnera. Inngest i Trigger.dev mieszczą się w darmowych/tanich planach. Pro Inngest (99 $) to pozycja na granicy NO GO.

**Własny serwer + SQLite.** Ma sens dopiero przy własnym ticket trackerze albo Linearze (patrz kolumna „Linear tickets” w skillu). Przy GitHub Issues odtwarza ręcznie to, co Actions daje za darmo.

## Orkiestracja deterministyczna vs agentowa

### Co mówią źródła

- **Anthropic, „Building effective agents” (2024-12-19).** Rozróżnia _workflows_, czyli „LLMs and tools are orchestrated through predefined code paths”, od _agents_, które „dynamically direct their own processes and tool usage”. Workflows pasują tam, gdzie potrzebna jest „predictability and consistency for well-defined tasks”, a agenci tam, gdzie potrzebna jest „flexibility and model-driven decision-making”. Zalecenie: zaczynać od najprostszego rozwiązania i dodawać złożoność „only when it demonstrably improves outcomes”.
- **Anthropic, „How we built our multi-agent research system” (2025-06-13).** Wzorzec orchestrator-worker z agentem prowadzącym. Koszt: „multi-agent systems use about 15× more tokens than chats”. Problem kontekstu: agent prowadzący zapisuje plan do pamięci, bo „if the context window exceeds 200,000 tokens it will be truncated”. Uwaga: „most coding tasks involve fewer truly parallelizable tasks than research”.
- **Anthropic, „Effective context engineering for AI agents” (2025-09-29).** „Context rot”: wraz z zapełnianiem okna maleje zdolność modelu do odtwarzania informacji. Kontekst to „a finite resource with diminishing marginal returns”. Zalecane techniki to compaction, structured note-taking poza oknem kontekstu oraz sub-agenci w czystych oknach, z których każdy „returns only a condensed, distilled summary”.
- **Anthropic, „Effective harnesses for long-running agents” (2025-11-26).** „Each new session begins with no memory of what came before.” Stan odtwarzany jest z historii git i pliku postępu. Sesja bierze „only one feature at a time” i kończy się czystym stanem: commit plus aktualizacja notatek.

### Wnioski dla fabryki

1. **Decyzja „co dalej” między runami należy do deterministycznego kodu.** Wyboru tasku i momentu startu (etykieta `ready` → implement, otwarty PR → automated review, limit prób w pętli implement ↔ review) dokonuje się na podstawie stanu ticketu i PR. To „predefined code paths”: przewidywalne, tanie, testowalne i bez kontekstu do przeładowania. Orchestrator (GitHub Actions) jest tu dispatcherem reguł, nie agentem.
2. **Agent decyduje wewnątrz runu.** Jak zaimplementować, co poprawić po review, jak rozbić ticket przy explore/plan: tu potrzebna jest elastyczność, więc to robi agent.
3. **„Run kończy się zmianą w ticket trackerze / na git hoście” rozwiązuje przeładowanie kontekstu.** Robi to tym samym mechanizmem, który Anthropic opisuje jako structured note-taking i świeży start sesji:
   - każdy run zaczyna z czystym oknem;
   - pamięcią między runami są ticket, komentarze, gałąź i PR, czyli zewnętrzna, trwała i czytelna dla człowieka „notatka”;
   - żaden agent nie musi trzymać w kontekście historii całej fabryki.

   Zamiast jednego orchestratora-agenta, który rośnie z każdym ticketem i trafia na context rot i 15× koszt tokenów, mamy wiele krótkich runów z małym kontekstem. Czyta je deterministyczny orchestrator bez kontekstu.

4. **Agentowy orchestrator** (np. agent, który sam czyta backlog i rozdziela pracę) ma sens dopiero wtedy, gdy wybór kolejnego kroku wymaga osądu. Nawet wtedy lepiej wyodrębnić go jako osobny task (np. „triage”), którego run kończy się zmianą etykiet, niż czynić go stałym orchestratorem.
5. **Hamulce leżą po stronie deterministycznej.** Limit prób w pętli, `concurrency` per ticket i throttling triggerów to kod/konfiguracja, nie prompt.

## Źródła

- GitHub Docs, Control the concurrency of workflows and jobs: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs
- GitHub Docs, Billing for GitHub Actions: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions
- GitHub Docs, Actions limits: https://docs.github.com/en/actions/reference/limits
- GitHub Docs, Triggering a workflow (GITHUB_TOKEN): https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
- anthropics/claude-code-action, setup (`CLAUDE_CODE_OAUTH_TOKEN`, `claude setup-token`): https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md
- Claude Code Docs, Scheduled tasks (formerly routines), research preview: https://code.claude.com/docs/en/routines
- Inngest pricing: https://www.inngest.com/pricing
- Inngest concurrency: https://www.inngest.com/docs/guides/concurrency
- Inngest idempotency: https://www.inngest.com/docs/guides/handling-idempotency
- Inngest serving functions: https://www.inngest.com/docs/learn/serving-inngest-functions
- Trigger.dev pricing: https://trigger.dev/pricing
- Trigger.dev idempotency: https://trigger.dev/docs/idempotency
- Trigger.dev queue concurrency: https://trigger.dev/docs/queue-concurrency
- Temporal pricing: https://temporal.io/pricing
- Temporal Workflow ID: https://docs.temporal.io/workflow-execution/workflowid-runid
- Hetzner Cloud: https://www.hetzner.com/cloud
- Anthropic, Building effective agents (2024-12-19): https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, Multi-agent research system (2025-06-13): https://www.anthropic.com/engineering/multi-agent-research-system
- Anthropic, Effective context engineering for AI agents (2025-09-29): https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic, Effective harnesses for long-running agents (2025-11-26): https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

Niezweryfikowane w źródłach pierwotnych: obsługa webhooków GitHuba przez Trigger.dev (zakładam, że trzeba je odebrać własnym endpointem) oraz dokładne godzinowe limity eventów GitHuba dla scheduled tasks (dokumentacja mówi tylko „per-task and per-account hourly caps”).
