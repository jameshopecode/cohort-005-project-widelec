# 3a. Kontener agenta, wyłącznik awaryjny, strażnik, twarde limity

## Obraz kontenera

- Baza `node:22-bookworm-slim` + narzędzia + Claude Code + sandbox-runtime (`srt`) + pnpm + `tinyproxy`.
- Kopie binarek do `/usr/local/bin` (pierwsze w `PATH`): `cp /usr/bin/bwrap /usr/local/bin/bwrap` i to samo dla `tinyproxy`. Profile AppArmor hosta są przypięte do ścieżek w `/usr/bin` i działają także w kontenerze.
- Wypieczone przy buildzie (jako root): Chromium przez `playwright install --with-deps chromium` w `PLAYWRIGHT_BROWSERS_PATH` (katalog tylko do odczytu w runie) i binarka Convex w `~/.cache/convex`. Dzięki temu run nie pobiera przeglądarki ani binarki, a lista domen jest krótka.
- Rozmiar ~790 MB. Prywatny pakiet GHCR, job agent ciąga go po `@sha256:` z pliku digestu na `main`.
- Wersja Playwright w obrazie musi się zgadzać z `package.json` gałęzi; prepare to sprawdza (niezgodność → `needs-human`). Podbicie Playwright = przebudowa obrazu.

## Uruchomienie joba agent

1. Checkout (`GITHUB_TOKEN` `contents: read`), podmiana `.claude/` na wersję z `main`.
2. Logowanie do GHCR (`GITHUB_TOKEN` `packages: read`) i pull obrazu po digeście.
3. Na VM: `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`.
4. Kontener:

```bash
docker run --rm --cap-add NET_ADMIN \
  --security-opt seccomp=userns.json \
  --security-opt apparmor=unconfined \
  --security-opt systempaths=unconfined \
  ghcr.io/<owner>/<repo>-agent@sha256:… /entry.sh
```

- `userns.json`: domyślny profil seccomp Dockera (`moby/profiles`) + bezwarunkowe `unshare`, `clone`, `mount`, `umount2`, `pivot_root`, `setns`. Nigdy `seccomp=unconfined` ani `--privileged`.
- `/entry.sh` jako root: uruchamia `tinyproxy` pod osobnym uid; ustawia iptables; potem `setpriv --reuid=1000 --inh-caps=-all --bounding-set=-all --no-new-privs` i startuje agenta.
- Agent: uid 1000, pusty bounding set, `no_new_privs`, bez `sudo`, bez DNS; `iptables -F` kończy się odmową.
- Env agenta: `HTTPS_PROXY` / `HTTP_PROXY` na `tinyproxy`, `NO_PROXY=localhost,127.0.0.1` (lokalny Convex), `NODE_USE_ENV_PROXY=1`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `CLAUDE_CODE_OAUTH_TOKEN`, kanarek.
- Claude Code: `claude -p --max-turns <FACTORY_MAX_TURNS_<TASK>>`, `sandbox.enabled`, `failIfUnavailable`, `allowUnsandboxedCommands: false`, WebFetch zabroniony. Przy złej konfiguracji hosta Claude Code wychodzi przy starcie z czytelnym błędem, więc `failIfUnavailable` jest bramką. Proxy `srt` łączy się dalej przez `HTTPS_PROXY` jako parent proxy.

## Egress

- iptables przepuszcza na zewnątrz **tylko uid `tinyproxy`** (port 443 + DNS do resolvera); uid agenta ma tylko `lo`.
- `tinyproxy` filtruje domeny: `FilterDefaultDeny`, `ConnectPort 443`, wzorce ERE `^domena$`. Filtr działa po nazwie z `CONNECT`, bez inspekcji TLS.
- Allowlista po IP nie jest używana: CDN-y rotują adresy.
- **Lista domen w runie**: `api.anthropic.com`, `registry.npmjs.org`, `version.convex.dev`, `api.convex.dev`. Bez `github.com` (push do cudzego repo z tokenem z prompt injection) i bez `storage.googleapis.com` (dowolny bucket GCS). Domeny samego `claude` z tokenem potwierdza log proxy pierwszego runu.

Źródło: [Kontener agenta na hostowanym runnerze](https://github.com/jameshopecode/cohort-005-project-widelec/issues/60), [Model zagrożeń fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/47), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## Wyłącznik awaryjny

Procedura ręczna właściciela, w tej kolejności:

1. **Suspend App**: Settings → Applications → Installed GitHub Apps → Configure → Suspend.
2. **Unieważnienie tokenu Claude**: kosz przy tokenie w Settings > Claude Code albo Settings > Account → log out of all sessions.
3. **Wyłączenie workflowów** fabryki.
4. **Usunięcie gałęzi `agent/**`**, w tym `agent/evidence-*` (bypass admina rulesetu `evidence`). Linki do dowodów w komentarzach przestają działać.

Powrót: nowy token Claude w `factory-agent`, wznowienie App, `setup --enable-agent-workflows`.

## Kanarek

Fałszywy klucz AWS z canarytokens w `.env` w repo i w Environment `factory-agent`. Użycie klucza wysyła mail do właściciela, który ręcznie uruchamia wyłącznik awaryjny. Kanarek działa niezależnie od strażnika.

## Reguły strażnika

| Reguła                                                                                                                                                                     | Reakcja                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Runy workflowów z `FACTORY_AGENT_WORKFLOWS` z wystartowanym jobem `agent` w oknie od max(24 h temu, zamknięcie ostatniego `factory-alert`) > `FACTORY_GUARD_RUNS_24H` (60) | `factory-alert` przypisane do właściciela + wyłączenie workflowów agenta |
| Push bota poza `agent/**`                                                                                                                                                  | to samo                                                                  |
| Push właściciela na `main` (merge)                                                                                                                                         | brak reakcji                                                             |

- Przy otwartym `factory-alert` strażnik dopisuje komentarz zamiast nowego alertu.
- CI, strażnik i build obrazu zostają włączone. Ponowne włączenie: checklista w treści alertu → `setup --enable-agent-workflows` → zamknięcie issue.
- Próg 60 jest świadomie luźny: wiążącym hamulcem kosztu jest pula Actions.

Źródło: [Rozkład sekretów i uprawnień](https://github.com/jameshopecode/cohort-005-project-widelec/issues/52), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58), [Zestawienie końcowe projektu fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/56), [Budżet minut i tempo fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/59), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61)

## Twarde limity

### Limity jobów

| Job                | Runner          | `timeout-minutes`         | `--max-turns` |
| ------------------ | --------------- | ------------------------- | ------------- |
| agent: explore     | `ubuntu-latest` | 30                        | 80            |
| agent: implement   | `ubuntu-latest` | 60                        | 200           |
| agent: review      | `ubuntu-latest` | 30                        | 150           |
| agent: decompose   | `ubuntu-latest` | 20                        | 40            |
| prepare / publish  | `ubuntu-slim`   | 10                        | —             |
| CI (`ci`)          | `ubuntu-slim`   | ≤ 15                      | —             |
| strażnik / łańcuch | `ubuntu-slim`   | 5                         | —             |
| CI (`mutation`)    | `ubuntu-latest` | z realnego czasu (plik 4) | —             |
| build obrazu       | `ubuntu-latest` | z realnego czasu (plik 4) | —             |

- Przekroczenie czasu albo tur (`subtype: "error_max_turns"`) to porażka runu → `agent:blocked`; run liczy się do limitu 12.
- `--max-budget-usd` nie jest używany (liczy stawki API, nie subskrypcję).
- Wartości to ~2–3× oczekiwanego czasu; koryguje je pierwszy miesiąc.

### Zmienne repo `FACTORY_*`

Tworzy je setup; workflow czyta `fromJSON(vars.…)` z tą samą wartością domyślną w kodzie, a zmienna wygrywa. Zmienia je tylko admin repo, bez commita.

| Zmienna                                                               | Wartość                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------ |
| `FACTORY_TIMEOUT_EXPLORE` / `_IMPLEMENT` / `_REVIEW` / `_DECOMPOSE`   | 30 / 60 / 30 / 20                                      |
| `FACTORY_MAX_TURNS_EXPLORE` / `_IMPLEMENT` / `_REVIEW` / `_DECOMPOSE` | 80 / 200 / 150 / 40                                    |
| `FACTORY_MAX_PARALLEL`                                                | 5 (runy agenta globalnie)                              |
| `FACTORY_GUARD_RUNS_24H`                                              | 60                                                     |
| `FACTORY_MAX_RUNS_PER_TICKET`                                         | 12                                                     |
| `FACTORY_MAX_REVIEW_RUNS`                                             | 3                                                      |
| `FACTORY_MAX_SUBISSUES`                                               | 12                                                     |
| `FACTORY_OWNER`                                                       | login właściciela                                      |
| `FACTORY_PROTECTED_PATHS`                                             | lista z pliku 3                                        |
| `FACTORY_AGENT_WORKFLOWS`                                             | pliki workflowów explore, implement, review, decompose |

### Limity kosztu i retencja

- Actions bez karty: twardy stop po puli 18 $; GitHub wysyła mail przy 90% i 100%.
- Claude: extra usage i auto-reload wyłączone; limity 5 h i tygodniowy są twardym stopem → `agent:blocked`.
- Artefakty: tylko między jobami, retencja 1 dzień. Cache Actions: nieużywany.
- Gałęzie: `agent/<n>` usuwane automatycznie po merge; `agent/evidence-*` zostają.
- Token App: 1 h, unieważniany na końcu joba.

Źródło: [Twarde limity kosztu i czasu](https://github.com/jameshopecode/cohort-005-project-widelec/issues/53), [Konfiguracja git hosta i ticket trackera pod fabrykę](https://github.com/jameshopecode/cohort-005-project-widelec/issues/55), [Budżet minut i tempo fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/59), [Mapa zdarzeń i triggerów fabryki](https://github.com/jameshopecode/cohort-005-project-widelec/issues/58)
