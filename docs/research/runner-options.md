# Przegląd opcji runnera

> Stan na 2026-11-21. Ceny i limity z vendorowych stron cennika i dokumentacji, czytanych tego dnia. Ticket: [#43](https://github.com/jameshopecode/cohort-005-project-widelec/issues/43), mapa: [#41](https://github.com/jameshopecode/cohort-005-project-widelec/issues/41). Punkt wyjścia: `.claude/skills/software-factory/RUNNERS.md` (przegląd z 2026-10).

## Założenia do kosztów

- **Skala**: 5 dni w tygodniu, ok. 21,7 dnia w miesiącu, do 2 runów równolegle.
- **Scenariusz bazowy**: 8 runów dziennie po 20 min, czyli ok. **3 470 min (58 h) w miesiącu**.
- **Scenariusz wysoki**: 15 runów dziennie po 30 min, czyli ok. **9 750 min (163 h) w miesiącu**.
- **Rozmiar runnera**: 2 vCPU i 4 GiB RAM, co wystarcza na pnpm, typecheck, vitest i mutacje.
- **Tokeny modelu**: idą z subskrypcji Claude właściciela, więc są poza kosztem infrastruktury.
- **Oznaczenia** według progów z mapy: ✅ do 40 $, ⚠️ 40–100 $ (pozycja oznaczona), ⛔ powyżej 100 $ (NO GO).

## Wspólne dla wszystkich runnerów

- **Token Claude**: `claude setup-token` wydaje token OAuth ważny rok. Uprawnia tylko do zapytań do modelu, a run dostaje go w zmiennej `CLAUDE_CODE_OAUTH_TOKEN` ([docs](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token)). Strona nie opisuje, jak taki token unieważnić. Szybka unieważnialność, którą mapa stawia jako warunek, jest więc nadal **do weryfikacji**.
- **Testy z Convexem**: `convex-test` to mock backendu Convex działający w Vitest, bez wdrożonego backendu ([docs](https://docs.convex.dev/testing/convex-test)). Dzięki temu automated checks działają na każdym runnerze, który uruchamia Node i pnpm. Testy na prawdziwym lokalnym backendzie wymagają pobrania jego binarki, czyli jednej domeny więcej na egress allowlist.
- **Minimalna egress allowlist** dla runu implement: `*.anthropic.com` (z `claude.ai` i `platform.claude.com` do uwierzytelniania), `registry.npmjs.org`, `github.com` i `*.githubusercontent.com`. Pełną listę domen Claude Code podaje [network-config](https://code.claude.com/docs/en/network-config.md#network-access-requirements).

## Porównanie

| Runner                           | Izolacja od hosta właściciela                                                 | Egress allowlist                                                   | Sekrety                                                                   | Start (deklaracja vendora lub szacunek) | Koszt/mies. bazowy → wysoki      | Utrzymanie |
| -------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------- | -------------------------------- | ---------- |
| Host lokalny                     | brak                                                                          | brak                                                               | w środowisku i plikach właściciela                                        | 0 s                                     | 0 $ ✅                           | niskie     |
| Lokalny Docker / devcontainer    | kontener, wspólne jądro VM Dockera; bind mount repo                           | `init-firewall.sh` (iptables, wymaga `NET_ADMIN`)                  | zmienna środowiskowa w kontenerze, czytelna dla runu                      | sekundy                                 | 0 $ ✅                           | średnie    |
| Docker Sandboxes (`sbx`)         | microVM z osobnym jądrem; tryb `--clone` albo bez montowania                  | proxy na hoście, domyślnie deny                                    | proxy na hoście wstrzykuje nagłówki, token **nie wchodzi** do VM          | sekundy (niezmierzone)                  | 0 $ lokalnie ✅                  | średnie    |
| Sandbox Claude Code              | tylko Bash; Read/Edit, hooki i MCP poza nim; **natywny Windows bez sandboxa** | proxy z `allowedDomains`                                           | domyślnie czyta `~/.ssh` i resztę katalogu domowego; trzeba to zablokować | 0 s                                     | 0 $ ✅                           | niskie     |
| GitHub Actions, runner hostowany | świeża VM na job, poza maszyną właściciela                                    | **brak wbudowanej**                                                | Actions secret jako zmienna środowiskowa, czytelna dla runu               | dziesiątki sekund (szacunek)            | ~3–9 $ ✅ → ~41–47 $ ⚠️          | najniższe  |
| GitHub Actions, self-hosted      | zależy od maszyny; tryb ephemeral                                             | własny firewall maszyny                                            | Actions secret na maszynie                                                | sekundy plus kolejka                    | 0 $ za minuty + koszt maszyny    | wysokie    |
| Daytona                          | sandbox u vendora                                                             | Tier 1–2: tylko „essential services”; Tier 3+: domenowa allowlista | zmienne przy create, czytelne dla runu                                    | deklarowane ok. 1 s                     | ~10 $ → ~27 $ ✅                 | niskie     |
| E2B (Hobby)                      | microVM u vendora                                                             | `allowOut` z domenami i CIDR, `denyOut`                            | zmienne przy create, czytelne dla runu                                    | deklarowane ok. 1 s                     | ~10 $ → ~27 $ ✅                 | niskie     |
| Modal Sandboxes                  | sandbox u vendora                                                             | `outbound_cidr_allowlist`; domenowa allowlista w becie (SNI)       | `modal.Secret` jako zmienne                                               | brak liczby w docs                      | ~0 $ → ~9 $ ✅ (po 30 $ kredytu) | niskie     |
| Fly Machines                     | maszyna Firecracker u vendora                                                 | brak natywnej allowlisty w czytanych docs (do weryfikacji)         | sekrety Fly jako zmienne                                                  | sekundy (niezmierzone)                  | ~2–5 $ → ~6–15 $ ✅              | średnie    |
| VPS (Hetzner) + Docker           | osobny serwer, kontener na run                                                | Cloud Firewall tylko po IP, domeny przez własny proxy              | na serwerze; run dostaje je przez zmienne                                 | sekundy (kontener)                      | 17–36 € flat ✅                  | wysokie    |

## Szczegóły per opcja

### Host lokalny

Run ma wszystko, co ma właściciel: prywatne i firmowe dostępy oraz pliki. Przekracza „najgorszą akceptowalną stratę” z mapy, więc **odpada** jako runner dla runów bez nadzoru.

### Lokalny kontener (Docker, devcontainer)

- Referencyjny devcontainer Claude Code ma skrypt `init-firewall.sh`, który przepuszcza ruch wychodzący tylko do dozwolonych celów.
- Dokumentacja ostrzega, że z `--dangerously-skip-permissions` kontener nie chroni przed eksfiltracją niczego, co jest w środku, łącznie z tokenem w `~/.claude` ([docs](https://code.claude.com/docs/en/devcontainer)).
- Bind mount repo daje runowi zapis prosto na dysk hosta.
- Wymaga włączonego komputera właściciela.

### Docker Sandboxes

Najlepszy model sekretów spośród opcji lokalnych:

- microVM z osobnym jądrem, bez wspólnej pamięci i procesów z hostem.
- Ruch TCP wychodzi przez proxy na hoście z polityką deny-by-default. UDP i ICMP są zablokowane.
- Proxy wstrzykuje nagłówki uwierzytelniające, więc **surowe poświadczenia nie trafiają do VM**. Przy subskrypcji token zostaje na hoście.
- Każdy sandbox ma prywatny Docker Engine, więc da się w nim postawić lokalny backend Convex.
- Lokalne użycie jest darmowe, także komercyjne ([docs](https://docs.docker.com/ai/sandboxes/), [security](https://docs.docker.com/ai/sandboxes/security/)).

Ograniczenia:

- Czytane strony nie potwierdzają wsparcia dla Windows ani trybu headless dla runów bez nadzoru. **Do weryfikacji.**
- Wymaga włączonego komputera.
- Domyślna polityka zawiera szerokie wildcardy, np. `*.googleapis.com`, które trzeba przejrzeć.

### Sandbox Claude Code

To bariera ochronna dla sesji, nie runner:

- Na natywnym Windows komendy idą bez sandboxa, potrzebny jest WSL2.
- Domyślnie run może czytać `~/.ssh` i `~/.aws/credentials`.
- Wbudowane narzędzia Read/Edit/Write, hooki i serwery MCP działają poza nim.
- Istnieje furtka `dangerouslyDisableSandbox` ([docs](https://code.claude.com/docs/en/sandboxing)).

Przydaje się jako dodatkowa warstwa wewnątrz innego runnera, a nie jako granica od maszyny właściciela.

### GitHub Actions, runner hostowany

- Każdy job dostaje świeżą VM ([docs](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)). Job trwa maksymalnie 6 h. Na planie Free można mieć 20 jobów równolegle, na Pro 40 ([limits](https://docs.github.com/en/actions/reference/limits)).
- Linux 2-core kosztuje **0,006 $/min** ([pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)). Plan zawiera miesięcznie **12 $ (Free) albo 18 $ (Pro)**, czyli ok. 2 000 albo 3 000 minut ([billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).
- Koszt w scenariuszu bazowym: 3 470 × 0,006 = 20,8 $, po odjęciu puli **3–9 $**. W scenariuszu wysokim: 58,5 $, po odjęciu puli **41–47 $ ⚠️**.
- Uwaga: z tej samej puli korzystają automated checks repo docelowego (CI na PR), więc realny koszt będzie wyższy.
- Ta opcja wypełnia też sloty orchestratora (workflow trigger, concurrency group) i observability platform (strona runu).
- Słabości: **brak wbudowanej kontroli ruchu wychodzącego**, a token Claude leży w zmiennej środowiskowej runu. Run po prompt injection może więc wysłać token gdziekolwiek. Ten scenariusz mapa dopuszcza tylko przy szybkiej unieważnialności tokenu.

### GitHub Actions, self-hosted

- Minuty na self-hosted są obecnie **darmowe** i nie zużywają puli ([billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). Job może trwać do 5 dni.
- GitHub ogłosił opłatę 0,002 $/min od 2026-03, a w grudniu 2025 ją odłożył ([changelog](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/)). Gdyby wróciła, kosztowałaby ok. 7 $ w scenariuszu bazowym i 20 $ w wysokim.
- To sposób uruchamiania, a nie maszyna. Sensowny tylko na odizolowanej maszynie (VPS albo VM), w trybie ephemeral, z kontenerem na run.
- Na komputerze właściciela daje te same problemy co host lokalny.

### Daytona

- Cena: vCPU 0,0504 $/h, RAM 0,0162 $/GiB/h, dysk do 5 GiB gratis. Rozliczenie na sekundy, 200 $ darmowych kredytów ([pricing](https://www.daytona.io/pricing)).
- Konfiguracja 2 vCPU / 4 GiB kosztuje 0,166 $/h, czyli **~10 $** w scenariuszu bazowym i **~27 $** w wysokim. Kredyt pokrywa pierwsze miesiące.
- Egress ([network-limits](https://www.daytona.io/docs/en/network-limits/)):
  - Tier 1 (zweryfikowany e-mail) i Tier 2 (karta i 25 $ doładowania) mają sieć ograniczoną do listy „essential services”. Lista obejmuje npm, GitHub i `*.anthropic.com`, więc działa jak gotowa, choć szeroka allowlista.
  - Własna `domainAllowList` (do 100 domen) i `networkBlockAll` wymagają **Tier 3, czyli 500 $ doładowania** ([limits](https://www.daytona.io/docs/en/limits/)).
  - Przy allowliście domen proxy terminuje TLS własnym CA.

### E2B

- Hobby kosztuje 0 $ plus użycie (jednorazowo 100 $ kredytu). Ma limit **1 h na sesję** i 10 sandboxów równolegle.
- Pro to **150 $/mies. ⛔** plus użycie, z limitem sesji 24 h ([pricing](https://e2b.dev/pricing)).
- Cena: vCPU 0,000014 $/s, RAM 0,0000045 $/GiB/s. Konfiguracja 2 vCPU / 4 GiB kosztuje 0,166 $/h, czyli **~10 $ → ~27 $**.
- Egress: `allowOut` przyjmuje domeny i CIDR, `denyOut` przyjmuje CIDR. Filtrowanie po domenie działa tylko dla HTTP:80 i TLS:443 ([docs](https://docs.e2b.dev/sandbox/internet-access)).
- Limit 1 h na Hobby może uciąć długi run implement, więc trzeba go trzymać krótszym.

### Modal Sandboxes

- Starter kosztuje 0 $ i daje **30 $ kredytu miesięcznie**. Sandboxy są liczone po stawce non-preemptible: CPU 0,00003942 $/rdzeń/s, RAM 0,00000667 $/GiB/s. Płaci się za większą z wartości: rezerwację albo faktyczne użycie ([pricing](https://modal.com/pricing)).
- Pesymistycznie, przy 1 rdzeniu i 4 GiB, wychodzi 0,24 $/h: 14 $ w scenariuszu bazowym i 39 $ w wysokim. Po kredycie to **~0 $ → ~9 $**. Czas czekania na model zużywa mało CPU, więc realny koszt jest niższy.
- Timeout domyślnie wynosi 5 min, a maksymalnie 24 h ([docs](https://modal.com/docs/guide/sandboxes)).
- Egress: `block_network`, `outbound_cidr_allowlist` i `outbound_domain_allowlist`. Ta ostatnia jest w becie, działa po SNI i domain fronting może ją obejść ([networking](https://modal.com/docs/guide/sandbox-networking)).

### Fly Machines

- Rozliczenie na sekundy działania. W regionie iad shared-cpu-2x z 2 GB kosztuje 13,39 $/mies. ciągłej pracy, a performance-2x z 4 GB 66 $/mies. Dodatkowy RAM to 6 $/GB/mies. Rootfs zatrzymanej maszyny kosztuje 0,15 $/GB/mies.
- Rachunek poniżej 5 $ w organizacji osobistej jest anulowany ([pricing](https://docs.fly.io/about/pricing)).
- Przeliczenie na godziny: shared-2x z 4 GB ok. 0,035 $/h, performance-2x ok. 0,092 $/h. Daje to **~2–5 $** w scenariuszu bazowym i **~6–15 $** w wysokim.
- Czytane strony nie opisują egress allowlisty. Trzeba by ją zbudować w obrazie (iptables lub proxy). Do weryfikacji.
- Orchestrator musi sam tworzyć i niszczyć maszyny przez Machines API.

### VPS (Hetzner) + Docker

- CPX22 (2 vCPU, 4 GB) kosztuje **16,99 € w Finlandii albo 19,99 € w Niemczech** na miesiąc. CPX32 (4 vCPU, 8 GB, wystarczy na 2 runy równolegle) kosztuje **30,49 € albo 35,99 €**, z limitem miesięcznym i IPv4 w cenie ([cennik](https://www.hetzner.com/cloud/regular-performance)).
- Cloud Firewall jest darmowy, ale filtruje tylko po IP ([docs](https://docs.hetzner.com/cloud/firewalls/overview/)). Allowlista domen wymaga własnego proxy.
- Run dostaje kontener `docker run --rm`. Serwer można wykorzystać jako self-hosted runner Actions w trybie ephemeral albo jako hosta orchestratora.
- Najwięcej utrzymania: aktualizacje, hardening i własny egress proxy.

## Poza listą z ticketu: Claude Code w chmurze

- Działa na planach Pro, Max, Ultra i Team. Run zużywa limit subskrypcji i **nie ma osobnej opłaty za VM** ([docs](https://code.claude.com/docs/en/claude-code-on-the-web)).
- Sieć jest domyślnie ograniczona do allowlisty i można ją wyłączyć.
- Poświadczenia git i sekrety sieciowe zostają poza VM: proxy dokleja je po stronie serwera.
- Triggery to cron, API i zdarzenia GitHuba ([routines](https://code.claude.com/docs/en/routines)).
- Przy koszcie 0 $ i modelu sekretów zgodnym z mapą warto ją sprawdzić razem z wyborem orchestratora.

## Wnioski

1. **Odpadają**: host lokalny (brak izolacji), sam sandbox Claude Code (nie jest granicą, na Windows nie działa natywnie) i E2B Pro (⛔ 150 $/mies.).
2. **Najprostsza opcja**: runner hostowany GitHub Actions. Jeden produkt wypełnia trzy sloty, a koszt to 3–9 $ w scenariuszu bazowym i **⚠️ 41–47 $** w wysokim, licząc razem z CI. Słabością jest brak egress allowlisty przy tokenie w zmiennej środowiskowej. Akceptowalna tylko wtedy, gdy token Claude da się szybko unieważnić.
3. **Najlepsza izolacja w budżecie**: microVM API, czyli Daytona, E2B Hobby albo Modal, za ~10–27 $ (Modal ~0–9 $ po kredycie). Każde ma egress allowlistę, ale z haczykami: Daytona wymaga Tier 3 do własnej listy (Tier 1–2 daje stałą, szeroką listę „essential”), E2B Hobby ma limit 1 h na run, a allowlista domen w Modal jest w becie. Wymaga własnego orchestratora.
4. **Najlepszy model sekretów**: Docker Sandboxes, gdzie token nigdy nie wchodzi do VM. Wymaga jednak włączonego komputera, a wsparcie Windows i trybu headless trzeba potwierdzić. To samo daje Claude Code w chmurze bez komputera i za 0 $.
5. **VPS Hetzner**: 17–36 € flat, pełna kontrola i najwięcej utrzymania. Ma sens, jeśli i tak hostuje orchestrator.

Otwarte do weryfikacji: unieważnianie tokenu z `claude setup-token`, Docker Sandboxes na Windows i w trybie headless, egress na Fly Machines oraz faktyczne czasy startu, które trzeba zmierzyć.
