# Wektory ataku na fabrykę agentów — kalendarium i źródła

Uzupełnienie do [attack-vectors.md](./attack-vectors.md). Wszystkie strony czytane
2026-11-21. _(wtórne)_ = vendor bezpieczeństwa lub prasa, nie strona, która
odkryła atak lub go padła ofiarą.

## Kalendarium incydentów

| Data       | Incydent                                                               | Mechanizm istotny dla fabryki                                                                                                                             | Źródło                                         |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 2025-03    | tj-actions/changed-files, CVE-2025-30066                               | Akcja przepisana na payload zrzucający sekrety z pamięci runnera do logów; KEV CISA 18 III 2025                                                           | CISA, NVD                                      |
| 2025-05    | GitHub MCP „toxic agent flow”                                          | Issue w publicznym repo → agent z tokenem konta czyta prywatne repo i publikuje je w PR                                                                   | Invariant Labs                                 |
| 2025-08-26 | Nx „s1ngularity”                                                       | Injection w workflow repo Nx → złośliwe wersje uruchamiały lokalne Claude/Gemini/Q CLI z flagami omijającymi uprawnienia, by szukać sekretów              | Nx postmortem                                  |
| 2025-09-14 | Shai-Hulud (fala 1)                                                    | `postinstall`; kradzież tokenów npm/GitHub/chmury; republikacja; workflow `shai-hulud-workflow.yml`                                                       | Socket _(wtórne)_                              |
| 2025-11-24 | Sha1-Hulud: The Second Coming                                          | `preinstall` + Bun; sekrety z GitHub Actions każdego osiągalnego repo; wiper `$HOME` przy braku tokenów; wejście w PostHog przez `pull_request_target`    | Socket _(wtórne)_                              |
| 2026-02    | Seria advisories Claude Code                                           | Ucieczka z sandboxa przez `settings.json` (GHSA-ff64-7w26-62rf), obejścia ochrony zapisu (`sed`, `cd`, `find`)                                            | anthropics/claude-code                         |
| 2026-02-17 | cline@2.3.0                                                            | Prompt injection w tytule issue do workflow triage z claude-code-action → zatruty cache → token npm; niepełna rotacja (unieważniono zły token)            | Cline postmortem; Snyk _(wtórne)_ dla łańcucha |
| 2026-03-18 | GHSA-mmgp-wc2j-qcv7                                                    | Obejście trust dialog Claude Code przez plik ustawień kontrolowany przez repo                                                                             | anthropics/claude-code                         |
| 2026-04-15 | „Comment and Control”                                                  | Tytuły PR / issue / komentarze przejmują agentów Claude Code Security Review, Gemini CLI Action, Copilot                                                  | CSA _(wtórne)_                                 |
| 2026-04-23 | Shai-Hulud: The Third Coming                                           | Skompromitowana akcja w pipeline release `@bitwarden/cli` 2026.4.0                                                                                        | Socket _(wtórne)_                              |
| 2026-04-29 | Mini Shai-Hulud                                                        | Hooki w `.claude/settings.json` i `.vscode/tasks.json` odpalające payload przy otwarciu projektu przez człowieka lub agenta; OIDC z pamięci runnera       | Socket _(wtórne)_; Unit 42                     |
| 2026-05-05 | Claude Code 2.1.128                                                    | Poprawka: blokada odczytu wrażliwych plików `/proc` (Read omijał sandbox Bubblewrap)                                                                      | Microsoft                                      |
| 2026-05-11 | TanStack, CVE-2026-45321                                               | `pull_request_target` buduje kod z forka → zatruty pnpm store w cache Actions → release przywraca cache → token OIDC z pamięci → 84 wersje w 42 pakietach | TanStack postmortem                            |
| 2026-05-12 | Publikacja kodu robaka                                                 | Kod źródłowy upubliczniony; copycaty                                                                                                                      | Socket, Unit 42 _(wtórne)_                     |
| 2026-06-05 | Microsoft: claude-code-action                                          | Ukryty komentarz HTML → Read `/proc/self/environ` → klucz Anthropic zniekształcony, by ominąć secret scanning                                             | Microsoft                                      |
| 2026-06    | GHSA-fg94-h982-f3mm, GHSA-7835-87q9-rgvv                               | Eksfiltracja przez „pre-approved” domenę w WebFetch; ucieczka z sandboxa przez git worktree                                                               | anthropics/claude-code                         |
| 2026-07-08 | npm 12 GA                                                              | Skrypty instalacyjne, git-deps i zdalne tarballe wyłączone domyślnie                                                                                      | GitHub changelog                               |
| 2026-08-04 | ChainDrop (keyv, cacheable)                                            | Dead-man's switch na hoście: komenda atakującego, gdy skradziony token przestaje działać                                                                  | Socket, Sonatype _(wtórne)_                    |
| 2026-10-02 | npm trusted publishing                                                 | Wygasanie niezwalidowanych konfiguracji po 48 h; odrzucanie tokenów z `issue_comment`                                                                     | GitHub changelog                               |
| 2026-10    | GHSA-5xjx-9qx6-jcrv, -5j29-h97v-84ch, -4p2j-qj3c-6x84, -pq7j-f95f-qfcv | TOCTOU w Edit, zapis przez symlink, złośliwy `git` w ścieżce, obejście przypięcia SHA pluginu                                                             | anthropics/claude-code                         |

## Źródła

Pierwotne (vendor, ofiara, odkrywca, rejestr CVE):

- pnpm, „Mitigating supply chain attacks”: <https://pnpm.io/supply-chain-security>
- GitHub Docs, „Secure use reference” (Actions): <https://docs.github.com/en/actions/reference/security/secure-use>
- GitHub changelog, polityka blokowania i SHA pinning akcji (2025-08-15): <https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/>
- GitHub changelog, npm 12 i deprecjacja GAT bypass2fa (2026-07-08): <https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation>
- GitHub changelog, wygasanie konfiguracji trusted publishing (2026-10-02): <https://github.blog/changelog/2026-10-02-unvalidated-npm-trusted-publishing-configurations-now-expire>
- GitHub blog, plan bezpieczniejszego npm: <https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/>
- Security advisories `anthropics/claude-code` (strony 1–2): <https://github.com/anthropics/claude-code/security/advisories>
- Claude Code, sandboxing: <https://code.claude.com/docs/en/sandboxing>
- CISA, alert tj-actions (2025-03-18): <https://cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-github-action-cve-2025-30066>
- NVD CVE-2025-30066: <https://nvd.nist.gov/vuln/detail/CVE-2025-30066>
- TanStack, postmortem: <https://tanstack.com/blog/npm-supply-chain-compromise-postmortem>
- Cline, postmortem cline@2.3.0: <https://cline.bot/blog/post-mortem-unauthorized-cline-cli-npm>
- Nx, s1ngularity postmortem: <https://nx.dev/blog/s1ngularity-postmortem>
- Microsoft Security Blog, claude-code-action (2026-06-05): <https://microsoft.com/en-us/security/blog/2026/06/05/securing-ci-cd-in-agentic-world-claude-code-github-action-case>
- Invariant Labs, GitHub MCP: <https://invariantlabs.ai/blog/mcp-github-vulnerability>

Wtórne (użyte do kalendarium fal Shai-Hulud i łańcuchów, których ofiara nie opisała):

- Socket, glosariusz Shai-Hulud (fale IX 2025 – X 2026): <https://socket.dev/glossary/shai-hulud>
- Unit 42, monitoring ataków npm: <https://unit42.paloaltonetworks.com/monitoring-npm-supply-chain-attacks/>
- Sonatype, Mini Shai-Hulud / keyv: <https://www.sonatype.com/blog/mini-shai-hulud-npm-attack-more-than-2200-components-impacted>
- Snyk, łańcuch ataku na Cline: <https://snyk.io/blog/cline-supply-chain-attack-prompt-injection-github-actions>
- CSA, „Comment and Control”: <https://labs.cloudsecurityalliance.org/research/csa-research-note-comment-control-github-prompt-injection-20/>

Uwaga: strona pnpm.io nie podaje wersji, od której obowiązują domyślne wartości;
nie przeczytano sekcji „Security limitations” dokumentacji sandboxa Claude Code ani
stron 3–4 listy advisories `anthropics/claude-code`.
