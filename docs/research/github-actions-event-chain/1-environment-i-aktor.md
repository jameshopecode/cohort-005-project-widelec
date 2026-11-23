# Pytania 1–3: Environment, aktor tokenu App, łańcuch `workflow_run`

Część [badania dla #57](../github-actions-event-chain.md). Wszystkie źródła sprawdzone **2026-11-23**.

## 1. Environment z regułą „deployment branches: tylko `main`”

**Fakty**

- Reguła gałęzi Environment jest dopasowywana do `GITHUB_REF` runu: „The deployment branch or tag rule is matched against the `GITHUB_REF` of the workflow run.”
  Źródło: <https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments>
- Ta sama strona mówi wprost: „Adding another branch rule for `refs/pull/*/merge` would also allow workflows triggered by `pull_request` events to deploy to the environment.” Wynika z tego, że sama reguła `main` ich nie przepuszcza.
- Job odwołujący się do Environment musi spełnić reguły ochrony, „before running or accessing the environment's secrets”. Sekrety Environment są dostępne tylko dla jobów, które się do niego odwołują.
  Źródło: <https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments>
- Wartości `GITHUB_REF` według zdarzenia:

| Zdarzenie | `GITHUB_REF` | `GITHUB_SHA` | Przechodzi „tylko `main`”? |
| --- | --- | --- | --- |
| `pull_request` (w tym `labeled`) | `refs/pull/N/merge` | ostatni merge commit gałęzi `refs/pull/N/merge` | **Nie** (potrzebna reguła `refs/pull/*/merge`) |
| `pull_request_target` | gałąź domyślna | ostatni commit gałęzi domyślnej | Tak, jeśli `main` jest domyślna |
| `issue_comment` (też na PR) | gałąź domyślna | ostatni commit gałęzi domyślnej | Tak, jeśli `main` jest domyślna |
| `workflow_run` | gałąź domyślna | ostatni commit gałęzi domyślnej | Tak, jeśli `main` jest domyślna |

  Źródło: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows>. Dla `issue_comment` docs dodają: „This event will only trigger a workflow run if the workflow file exists on the default branch.”

**Wnioski dla fabryki**

- Workflow na `pull_request: labeled` nie dostanie sekretów Environment „tylko `main`”. Dodanie `refs/pull/*/merge` otwiera Environment dla każdego PR, także z gałęzi spoza `main`.
- `issue_comment` na PR i `workflow_run` dostaną te sekrety, bo biegną na gałęzi domyślnej. To samo dotyczy `pull_request_target`. Kod z PR-a trzeba wtedy checkoutować świadomie: docs ostrzegają, że `pull_request_target`/`workflow_run` w połączeniu z checkoutem niezaufanego PR-a narażają repo na kompromitację.

**Nieudokumentowane**

- Jak dokładnie wygląda odrzucenie (czy job jest „failed”, czy „skipped”, i jaki jest komunikat). Docs mówią tylko, że job musi spełnić reguły.

## 2. Aktor zdarzeń wywołanych tokenem instalacji GitHub App

**Fakty**

- Zdarzenia wywołane przez `GITHUB_TOKEN` nie tworzą nowych runów. Są dwa wyjątki: `workflow_dispatch` i `repository_dispatch` zawsze tworzą runy, a `pull_request` `opened`/`synchronize`/`reopened` tworzy runy wymagające zatwierdzenia. Inne typy `pull_request` („such as `labeled`, `edited`, or `closed`”) runów nie tworzą.
  Źródło: <https://docs.github.com/en/actions/concepts/security/github_token>
- Na obejście docs zalecają: „you can use a GitHub App installation access token or a personal access token instead of `GITHUB_TOKEN`”.
  Źródła: <https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow>, <https://docs.github.com/en/actions/concepts/security/github_token>
- Tożsamość: „An installation token identifies the app as a GitHub App bot account, such as @jenkins[bot].” Do tego: „Bot accounts are specific to GitHub Apps and are built into every GitHub App.”
  Źródło: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps>
- „API requests made by an app installation are attributed to the app.”
  Źródło: <https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation>
- `github.actor` to „The username of the user that triggered the initial workflow run”, a `github.event` to „The full event webhook payload” (czyli `sender` pochodzi z webhooka). `github.actor_id` opisano jako „the person or app that triggered the initial workflow run”.
  Źródło: <https://docs.github.com/en/actions/reference/workflows-and-actions/contexts>

**Wnioski**

- Etykieta, komentarz lub push wykonane tokenem instalacji App **wyzwalają** workflowy. Docs pokazują to jako zalecany sposób obejścia blokady `GITHUB_TOKEN`; nie wymieniają typów zdarzeń, ale nie ma też wyjątków.
- Aktorem będzie bot aplikacji (`<slug>[bot]`).

**Nieudokumentowane**

- Docs Actions nie mówią dosłownie, że `github.actor` i `github.event.sender.login` dla zdarzenia z tokenu App mają wartość `<slug>[bot]` (ani jaki `sender.type`, np. `Bot`). Wynika to z opisu konta bota, ale trzeba to potwierdzić na prawdziwym runie.
- Docs nie wyliczają, czy token App wyzwala workflowy dla *każdego* typu zdarzenia (label, comment, push osobno).

## 3. Głębokość łańcucha `workflow_run`

**Fakty**

- „You can't use `workflow_run` to chain together more than three levels of workflows. For example, if you attempt to trigger five workflows (named `B` to `F`) to run sequentially after an initial workflow `A` has run (that is: `A` → `B` → `C` → `D` → `E` → `F`), workflows `E` and `F` will not be run.” Czyli za `A` uruchamiają się jeszcze `B`, `C` i `D`.
  Źródło: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows>
- Nie znalazłem w changelogu zmiany tego limitu. Changelog z listopada 2025 podniósł limity *reusable workflows* (do 10 poziomów zagnieżdżenia i 50 wywołań), a nie `workflow_run`.
  Źródło: <https://github.blog/changelog/2025-11-06-new-releases-for-github-actions-november-2025/>
- Strona limitów Actions nie wspomina o głębokości `workflow_run`: <https://docs.github.com/en/actions/reference/limits>

**Nieudokumentowane**

- Czy zdarzenie wykonane tokenem App (np. etykieta nałożona przez run) zaczyna nowy łańcuch, czyli resetuje licznik. Notatka o limicie nie wspomina tokenów, aplikacji ani resetu. Skoro limit opisano wyłącznie dla `workflow_run`, to zwykłe zdarzenie (label, comment) wyzwolone tokenem App najpewniej zaczyna nowy łańcuch, ale **docs tego nie potwierdzają**. Trzeba to sprawdzić eksperymentem.
