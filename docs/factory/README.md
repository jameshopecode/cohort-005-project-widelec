# Software factory — projekt do budowy

Zamknięty projekt software factory dla prywatnego repo właściciela (React Router + TypeScript + Convex + pnpm, konto osobiste na GitHub Pro). Każdy slot usług ma produkt albo świadome „brak”, każdy task ma odpowiedzi na 5 pytań, jest model zagrożeń, miesięczny koszt, lista rzeczy do sprawdzenia i kolejność budowy.

Ten katalog jest samowystarczalny: budujący nie musi czytać ticketów. Linki „Źródło” prowadzą do ticketów, w których zapadła decyzja, i służą tylko do sprawdzenia uzasadnienia. Wszystkie liczby i nazwy tutaj są obowiązujące.

## Słownictwo

Pliki używają słownictwa skilla `software-factory`: **task** (rodzaj pracy), **trigger** (zdarzenie startujące run), **run** (jedno wykonanie tasku), **runner** (jednorazowa maszyna runu), **ticket tracker**, **ticket source**, **git host**, **orchestrator**, **observability platform**. Hamulce: **automated checks**, **automated review**, **human review**.

Pozostałe stałe terminy:

- **Właściciel**: jedyny człowiek fabryki, login w zmiennej `FACTORY_OWNER`. Tylko on pisze tickety i mergeuje PR-y.
- **Bot**: GitHub App „factory”, w zdarzeniach jako `<slug>[bot]`.
- **AFK / HITL**: faza bez człowieka (run) / faza, w której człowiek zmienia etykietę albo mergeuje.
- **Spec**: ticket, który decompose dzieli na sub-issues.

## Pliki

| Plik                                                                             | Zawartość                                                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [1-sloty-i-koszt.md](1-sloty-i-koszt.md)                                         | Sloty usług z produktami, model kosztu ticketu, miesięczny koszt brutto przy 4 i 8 ticketach/dzień, start bez karty |
| [2-taski-przeplyw.md](2-taski-przeplyw.md)                                       | Etykiety i maszyna stanów, mapa zdarzeń, układ jobów runu, liczniki, grupy `concurrency`                            |
| [2a-taski-agenta.md](2a-taski-agenta.md)                                         | Taski z agentem: explore, implement, automated review, decompose — 5 pytań                                          |
| [2b-taski-deterministyczne.md](2b-taski-deterministyczne.md)                     | Taski bez agenta: łańcuch, strażnik, CI, build obrazu, setup, podgląd `sbx` — 5 pytań                               |
| [3-bezpieczenstwo-i-limity.md](3-bezpieczenstwo-i-limity.md)                     | Model zagrożeń, ryzyka akceptowane, sekrety i uprawnienia, git host                                                 |
| [3a-kontener-wylacznik-limity.md](3a-kontener-wylacznik-limity.md)               | Kontener agenta, egress, wyłącznik awaryjny, kanarek, reguły strażnika, twarde limity                               |
| [4-do-sprawdzenia-i-kolejnosc-budowy.md](4-do-sprawdzenia-i-kolejnosc-budowy.md) | Lista „do sprawdzenia przy budowie” i kolejność budowy z kryterium ukończenia każdego kroku                         |

Czytaj w kolejności numerów. Budowę zacznij od pliku 4, sekcja „Kolejność budowy”: każdy krok wskazuje, które sekcje plików 1–3 realizuje.

## Poza zakresem

- Ścieżka wyjścia kosztowego poza GitHub Actions (sandbox E2B, porównanie z Daytoną dopiero przy realnym przekroczeniu sufitu 8 ticketów/dzień): decyzja eksploatacyjna po budowie.
- Polityka auto-merge. Furtka zostaje otwarta: druga App „merger” (plik 3).
- Zewnętrzne ticket sources (feedback button, monitory).
- Workflow deployu. Jedynym hamulcem przed produkcją jest human review.

Źródło: [Wayfinder map: Software factory — dobór usług i tasków](https://github.com/jameshopecode/cohort-005-project-widelec/issues/41), [Zestawienie końcowe projektu fabryki po audycie](https://github.com/jameshopecode/cohort-005-project-widelec/issues/61), [Runner sandbox przy wyczerpaniu puli Actions](https://github.com/jameshopecode/cohort-005-project-widelec/issues/62)
