# 3. Model zagrożeń, sekrety i git host

Kontener agenta, egress, wyłącznik awaryjny, kanarek, reguły strażnika i twarde limity są w [3a-kontener-wylacznik-limity.md](3a-kontener-wylacznik-limity.md).

## Model zagrożeń

**Aktywa chronione**: maszyna właściciela; `main`; deploy; sekrety produkcyjne (deploy i Convex); inne repo; kod repo (chroniony przed wyciekiem na poziomie listy dozwolonych domen).

**Akceptowalna strata**: skompromitowany run psuje co najwyżej gałęzie `agent/**` oraz tickety, komentarze i PR-y w tym jednym repo; zużywa limit subskrypcji Claude; wycieka token Claude, który da się unieważnić.

**Granice zaufania**:

- Zaufane: GitHub, Anthropic, Convex, dostawca runnera, treść ticketów (pisze je tylko właściciel).
- Wrogie: łańcuch dostaw (paczki npm, akcje GitHuba, binarki); treść z zewnątrz czytana przez agenta (prompt injection); niezłośliwie destrukcyjny agent.
- Poza modelem: insider, przejęte konto właściciela.

Wszystkie wektory sprowadzają się do „obcy kod w procesie z sekretem”. Fabryka zakłada, że każdy run jest skompromitowany.

### Kryteria

1. **Runner poza maszyną właściciela.** W kontenerze agenta jest tylko token Claude (+ kanarek). Klucz i token App nigdy nie trafiają na VM z obcym kodem.
2. **Egress przez listę dozwolonych domen**: proxy z filtrem domen + ścisły sandbox Claude Code (plik 3a).
3. **Ochrona ścieżek**: branch rulesety chronią wszystko poza `agent/**`; CODEOWNERS bramkuje merge wrażliwych ścieżek; publish odrzuca zmiany `FACTORY_PROTECTED_PATHS`; job agent startuje z `.claude/` z `main`; App nie ma uprawnienia Workflows, więc GitHub odrzuca każdy jej push zmieniający `.github/workflows/`.
4. **Bramy HITL**: przejścia wymagające człowieka tylko od `sender` = `FACTORY_OWNER`; bot wyzwala explore / implement tylko na issue z `agent:queued`; limit 12 runów na ticket hamuje kaskadę etykiet.
5. **Sekrety**: joby wykonujące kod z `agent/**` nie dostają innych sekretów niż z kryterium 1; sekrety leżą w Environments „tylko `main`”; zero sekretów repo; bez preview deployów; żaden workflow fabryki nie przywraca ani nie zapisuje cache Actions.
6. **Gałęzie agenta nigdy na hoście właściciela**: tylko na GitHubie albo w mountless `sbx`.
7. **Wykrywanie i reakcja**: wyłącznik awaryjny, kanarki, strażnik. Bez platformy monitoringu.

**Łańcuch dostaw**: pnpm `allowBuilds` / `strictDepBuilds`, `minimumReleaseAge` ≥ 1440, `trustPolicy: no-downgrade`, `blockExoticSubdeps`; akcje przypięte do pełnego SHA; zero `pull_request_target`.

### Ryzyka akceptowane

- **Ucieczka z kontenera agenta.** Na VM joba agent `kernel.apparmor_restrict_unprivileged_userns=0`, a kontener ma `apparmor=unconfined`: rośnie powierzchnia kernela (nieprzywilejowane user namespaces to typowy wektor LPE). Ucieczka daje root na jednorazowej VM: token Claude, `GITHUB_TOKEN` (`contents: read`, `packages: read`), token runtime z zapisem cache Actions dla `main` i uploadem artefaktów runu. Cache zamyka reguła zero cache, artefakty publish traktuje jako niezaufane; innych sekretów na tej VM nie ma.
- **Utrata konta Claude** przez sankcję za naruszenie ToS: odcina też czat i Claude Code właściciela. Ograniczają ją limity równoległości (5) i wolumenu (strażnik 60/24 h, 12/ticket).
- **Celowany wyciek kodu** przez dozwoloną domenę z poświadczeniami atakującego.
- **Domain fronting** na dozwolonych CDN-ach: proxy filtruje po nazwie z `CONNECT`, bez inspekcji TLS.
- **`sbx`**: kod w sandboxie może pisać do schowka hosta (czytać nie może); narzędzie jest młode (v0.54.0).
- **Produkcja**: jedynym hamulcem przed produkcją jest human review (workflow deployu poza zakresem).

Źródło: [Model zagrożeń fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/47), [Katalog wektorów ataku na fabrykę agentów](https://github.com/jameshopecode/cohort-005-project-widelec/issues/45), [Zestawienie końcowe projektu fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/56), [Kontener agenta na hostowanym runnerze](https://github.com/jameshopecode/cohort-005-project-widelec/issues/60), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## Sekrety i uprawnienia

### GitHub App „factory” (jedna)

- Prywatna, należy do konta właściciela, zainstalowana tylko na repo docelowym („Only select repositories”).
- Uprawnienia: **Contents RW, Issues RW, Pull requests RW, Metadata R**. Bez Workflows, Actions, Administration, Secrets, Environments, Variables i Packages.
- Każdy job wybija token z wąskimi `permission-*` i `repositories` = to repo; token żyje 1 h i jest unieważniany na końcu joba.
- Klucz App: wymiana tylko po incydencie (App może mieć do 25 kluczy naraz, bez przestoju).

### Environments (wszystkie z regułą gałęzi „tylko `main`”)

| Environment      | Zawartość                                                              | Używa                                            |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `factory-agent`  | `CLAUDE_CODE_OAUTH_TOKEN`, kanarek (fałszywy klucz AWS z canarytokens) | tylko job agent, wyłącznie wewnątrz kontenera    |
| `factory-github` | klucz prywatny App; App ID jako zmienna                                | prepare, publish, łańcuch, publish buildu obrazu |
| `production`     | deploy key Convex i inne sekrety deployu                               | tylko workflow deployu (poza zakresem)           |

Na poziomie repo nie ma żadnych sekretów. `issues` i `workflow_run` biegną na gałęzi domyślnej, więc dostają Environment; `pull_request` biegnie na `refs/pull/N/merge`, więc CI i wszystko z gałęzi agenta nie dostaje żadnego sekretu.

### `GITHUB_TOKEN`

- Domyślne uprawnienia w ustawieniach repo: read-only; „Allow GitHub Actions to create and approve pull requests” wyłączone.
- CI: `contents: read`. Job agent: `contents: read`, `packages: read`, poza kontenerem. prepare: `actions: read`. Strażnik: `actions: write`, `issues: write`. Build obrazu: `packages: write`, `contents: read`.

### Zero cache Actions

Żaden workflow fabryki (agent, prepare, publish, łańcuch, strażnik, CI, mutacje, build obrazu) nie używa `actions/cache`, `setup-node` `cache:` ani `cache-from: type=gha`, ani do odczytu, ani do zapisu. Powód: ucieczka z kontenera agenta daje zapis cache dla `main`, a cache `main` widzą wszystkie workflowy i PR-y.

### Token Claude

- `claude setup-token`: roczny, tylko inferencja, w niezmodyfikowanym `claude -p`.
- Unieważnienie: kosz przy tokenie w Settings > Claude Code albo Settings > Account → log out of all sessions. Usunięcie sekretu w GitHubie tokenu **nie** unieważnia.
- Rotacja co rok: krok ręczny. Wygaśnięcie objawia się porażką runu → `agent:blocked`.

Źródło: [Rozkład sekretów i uprawnień](https://github.com/jameshopecode/cohort-005-project-widelec/issues/52), [Subskrypcja Claude w runach bez człowieka](https://github.com/jameshopecode/cohort-005-project-widelec/issues/42), [Kontener agenta na hostowanym runnerze](https://github.com/jameshopecode/cohort-005-project-widelec/issues/60), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## Konfiguracja git hosta

Wszystko poniżej zapisuje skrypt setupu.

### Rulesety (branch i tag; push rulesetów na Pro nie ma)

| Ruleset      | Cel                             | Reguły                                                                                                                                                                                                                         | Bypass                                       |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `main`       | gałąź domyślna                  | PR wymagany, 1 approval, „dismiss stale approvals” + „approval of most recent reviewable push”, review od Code Owners, wymagany check `ci` ze źródłem GitHub Actions (nie-strict), blokada force-push i usuwania, tylko squash | admin repo w trybie „For pull requests only” |
| `poza-agent` | `~ALL` poza `agent/**` i `main` | blokada tworzenia, aktualizacji i usuwania                                                                                                                                                                                     | admin repo                                   |
| `tagi`       | wszystkie tagi                  | blokada tworzenia, aktualizacji i usuwania                                                                                                                                                                                     | admin repo                                   |
| `evidence`   | `agent/evidence-*`              | blokada usuwania i force-push                                                                                                                                                                                                  | admin repo (wyłącznik awaryjny)              |

PR otwiera App, więc approval właściciela jest prawdziwym human review; każdy push po zatwierdzeniu je unieważnia. Merge queue jest niedostępny na koncie osobistym, więc check `ci` jest nie-strict (bez wymogu aktualności gałęzi przy 5 równoległych PR-ach).

### Chronione ścieżki

- **`CODEOWNERS`** (owner: właściciel): `.github/`, `.claude/`, `CODEOWNERS`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`, katalog obrazu, plik digestu. GitHub czyta CODEOWNERS z `main`. Skrypt setupu i CI failują, gdy `codeowners/errors` zwraca błędy (błędna linia jest inaczej cicho pomijana).
- **`FACTORY_PROTECTED_PATHS`**: `.github/ .claude/ CODEOWNERS .npmrc pnpm-workspace.yaml CLAUDE.md AGENTS.md .mcp.json .vscode/ scripts/` + katalog obrazu + plik digestu. Publish odrzuca bundle dotykający tych ścieżek (`git diff --name-only main...<bundle>`) → `agent:blocked` z listą plików. Te pliki zmienia tylko właściciel własnym PR-em (wyjątek: plik digestu w PR „bump digest”). `package.json` i lockfile są dozwolone w `agent/<n>`, bo merge bramkuje CODEOWNERS.

### Ustawienia repo

- PR: tylko squash; auto-delete head branches włączone; „Allow auto-merge” wyłączone; „Always suggest updating PR branches” włączone.
- Actions: dozwolone akcje utworzone przez GitHuba + jawna lista; „Require actions to be pinned to a full-length commit SHA” włączone (skrypt sprawdza dostępność).
- Zmienne `FACTORY_*` (plik 3a) zmienia tylko admin repo; App nie ma uprawnienia Variables.

### Furtka AFK merge

Druga App „merger” zatwierdza oczywiste PR-y i spełnia wymóg 1 approval; PR-y dotykające ścieżek z CODEOWNERS dalej czekają na właściciela. Warunki otwarcia: o „oczywistości” decyduje wyłącznie kod deterministyczny (rozmiar diffu, ścieżki, etykieta); klucz mergera w osobnym Environment „tylko `main`”; lista CODEOWNERS przejrzana na nowo. Bypass actor dla App jest odrzucony, bo omija też CODEOWNERS.

Źródło: [Konfiguracja git hosta i ticket trackera pod fabrykę](https://github.com/jameshopecode/cohort-005-project-widelec/issues/55), [Zestawienie końcowe projektu fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/56), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)
