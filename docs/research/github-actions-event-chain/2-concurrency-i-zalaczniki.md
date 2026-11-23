# Pytania 4–5: `concurrency` i załączniki `gh` z tokenem App

Część [badania dla #57](../github-actions-event-chain.md). Wszystkie źródła sprawdzone **2026-11-23**.

## 4. `concurrency`: oczekujące runy i tryb kolejki

**Fakty**

- W grupie może w danej chwili działać najwyżej jeden job lub workflow. „By default, any existing `pending` job or workflow in the same concurrency group will be canceled”: nowy run zajmuje miejsce starszego oczekującego. `cancel-in-progress: true` anuluje także run już działający.
  Źródło: <https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency>
- Opcjonalna właściwość `queue`:
  - `single` (domyślna): „At most one job or workflow run can be `pending` in the concurrency group.”
  - `max`: „Up to 100 jobs or workflow runs can be `pending` in the concurrency group.”
  - „The combination of `queue: max` and `cancel-in-progress: true` is not allowed” (to błąd walidacji workflowa).
  - Kolejność: FIFO „according to the time each one started waiting on the concurrency group”, ale „ordering is not guaranteed”.
  Źródło: to samo co wyżej.
- Od kiedy: changelog z **2026-05-07** „GitHub Actions concurrency groups now allow larger queues”. Włącza się to przez `queue: max`, działa tylko przy `cancel-in-progress` równym `false` lub nieustawionym, a limit to 100 runów w grupie.
  Źródło: <https://github.blog/changelog/2026-05-07-github-actions-concurrency-groups-now-allow-larger-queues/>
- Przepełnienie: „Runs beyond this limit will be rejected.”
  Źródło: <https://docs.github.com/en/actions/reference/limits>

**Nieudokumentowane / niejasne**

- Źródła różnie opisują, co się dzieje z runem ponad limit 100. Strona limitów mówi „rejected”. Jeden z wyników wyszukiwania przypisywał stronie concurrency słowo „canceled”, ale przy bezpośrednim odczycie strony go nie znalazłem. Stan runu (odrzucony czy anulowany) trzeba sprawdzić.
- Changelog nie podaje, czy funkcja jest w GitHub Enterprise Server ani czy zależy od planu. Strona GHES 3.20 opisuje kolejność FIFO, więc prawdopodobnie jest też w GHES 3.20; dla nas, na github.com, to bez znaczenia.

## 5. `gh issue comment` / `gh pr comment --attach` z tokenem instalacji App

**Fakty**

- `--attach <file>` istnieje w `gh issue comment` i `gh pr comment`: „Attach an image or video file, in '<file>#<image alt text>' format”. Flagę można powtarzać, do 50 plików na komendę.
  Źródła: <https://cli.github.com/manual/gh_issue_comment>, <https://cli.github.com/manual/gh_pr_comment>
- Od kiedy: gh **v2.99.0**, changelog z **2026-09-01**. Wymaga „Write access to the repository”. Upload używa „the OAuth token from `gh auth login` or a classic personal access token”. „GitHub Enterprise Server is not supported in this release.” Limity rozmiaru to 10 MB dla obrazów i GIF-ów oraz 10 MB (Free) lub 100 MB (płatne) dla wideo.
  Źródło: <https://github.blog/changelog/2026-09-01-github-cli-media-in-issues-pull-requests-and-comments/>
- Docs: „You need push access to the repository to attach files.” Obsługiwane są tylko pliki graficzne i multimedia.
  Źródło: <https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli>
- Token instalacji App: zgłoszenie [cli/cli#14309](https://github.com/cli/cli/issues/14309) „`--attach` cannot work for GitHub App installation tokens — the upload endpoint 404s them even with write access”. Jest **otwarte**, z etykietami `blocked`, `platform` i `attachments`. Autor odpytał endpoint `uploads.github.com/user-attachments/assets` z prywatnego repo z prawem zapisu: `GITHUB_TOKEN` dostał 404, a token OAuth 201. Późniejszy komentarz (gh 2.103.3) mówi, że token `ghs_` przechodzi już kontrole po stronie klienta, ale endpoint dalej zwraca 404. gh zgłasza wtedy mylący komunikat „attaching files requires write access to the repository”.

**Wniosek**

- **Nie działa.** Z tokenem instalacji App (`ghs_`) `--attach` w prywatnym repo dostaje 404 z endpointu uploadu, mimo prawa zapisu. To ograniczenie platformy, nie CLI. Lokalny gh w tym repo to v2.74.2, który flagi `--attach` jeszcze nie ma.

**Nieudokumentowane**

- Oficjalne docs i changelog nie mówią wprost, że tokeny instalacji App są wykluczone. Changelog jedynie wymienia OAuth i klasyczny PAT jako obsługiwane. Zachowanie 404 opisują użytkownicy w trackerze `cli/cli`, a nie dokumentacja GitHuba; zgłoszenie nie ma jeszcze odpowiedzi opiekunów.
