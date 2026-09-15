# DevFest Hugo theme

Shared theme for the GDG Venezia DevFest websites (one site per edition, e.g. `devfest26`).
Originally derived from [coHub](https://github.com/StaticMania/hugo-cohub), fully redesigned.

Requires Hugo **extended ≥ 0.126** (content adapters, `js.Build`).

## Using it in a site

```toml
# config.toml
theme = "devfest-hugo-theme"
```

The theme ships the section pages (`/agenda/`, `/speakers/`, `/gallery/`) and generates one talk page
per session. Sponsors and venue live on the home page (`/#sponsors`, `/#venue`); `/sponsors/` redirects
there, while sponsor detail pages (`content/sponsors/*.md`) still render. A site only provides config, data files, speakers and images.

For local development against a checkout of this repo next to the sites:

```bash
hugo server --themesDir ..
```

## Site config

```toml
[[menu.main]]
name = "Agenda"
pageRef = "/agenda"
weight = 1
[[menu.main]]
name = "Sponsors"
url = "/#sponsors"
weight = 3

[params]
  description = "DevFest Venezia 2026 - 24 October - Venezia"
  logo = "images/logo.webp"
  copyright = "© {year} …"
  footerDescription = "Organized by …"
  [params.location.venezia]
  address = "Campus Scientifico Università Ca' Foscari"
  desc = "Via Torino, 155 Mestre, Venezia VE, 30170"
  mapsLink = "https://www.google.com/maps/dir//…"
```

## Data files (`data/`)

Every block with `enable: false` (or a missing file) is simply not rendered.

| File | Used for |
| --- | --- |
| `hero.yml` | `eyebrow`, `title` (HTML allowed), `subtitle` |
| `facts.yml` | Strip under the hero: `facts: [{label, value}]` |
| `feature.yml` | "What is DevFest" cards: `title`, `features: [{name, description}]` |
| `sessions.yml` | Agenda, program preview, talk pages, live bar (see below) |
| `comingSoon.yml` | Shown instead of the agenda while there are no sessions |
| `sponsor.yml` | Home sponsors section: `tiers: [{name, color, size: lg/md/sm, sponsors: [{name, image, link}]}]`, optional `cta`. `link` can point to a sponsor detail page (`sponsors/acme`) or an external site. A flat `partner:` list also works |
| `partner.yml` | `title`, `partner: [{name, image, link}]` — rendered as the last tier |
| `travel.yml` | `modes: [{mode, color, headline, detail}]` |
| `onTheDay.yml` | Cards under "Getting there" on the home page: `title`, `items: [{label, text}]` |
| `gallery.yml` | `galleryImage: [{image, alt}]` (home + hero mosaic), `albums: [{year, url, website?, cover?, color?}]` (past editions page; a `website` equal to the site's own baseURL is hidden) |
| `cfp.yml` | CFP band: `title`, `subtitle`, `buttonLabel`, `buttonTarget`, optional `deadline` |
| `ticket.yml` | When enabled, the main call to action becomes "Reserve a seat" (`itemPrices[0].buttonTarget`) |
| `footer.yml` | `columns: [{title, links: [{label, url}]}]` |

Colours are one of `blue`, `red`, `yellow`, `green`, `ink`.

### `sessions.yml`

```yaml
enable: true
date: "2026-10-24"
timezone: "Europe/Rome"
tracks:
  - name: "Mobile"
    color: "green"
sessions:
  - id: "kmp-in-production"      # URL: /agenda/kmp-in-production/
    title: "Kotlin Multiplatform in production"
    start: "09:45"
    end: "10:30"
    room: "Aula Alfa"
    track: "Mobile"
    lang: "ENG"
    level: "Intermediate"
    speakers: ["jane-doe"]        # file names in content/speakers/
    abstract: "Markdown allowed."
  - id: "lunch"
    title: "Lunch"
    start: "13:00"
    end: "14:00"
    service: true                 # no talk page, no save button
```

## Speakers (`content/speakers/<slug>.md`)

```yaml
name: "Jane Doe"
role: "Android GDE"               # `jobTitle` also works
photo: "/images/speakers/jane-doe.webp"
badge: "GDE"                      # optional
featured: true                    # shown on the home page
weight: 1
linkedin: "…"
bluesky: "…"
github: "…"
twitter: "…"
website: "…"
```

Note: Hugo reserves `lang` in front matter; use `talkLang` for the talk language when a speaker has no scheduled session.

The body is the bio (a `bio` front matter field also works).
