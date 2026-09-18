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

## Example site

`exampleSite/` is a complete, fictional edition that uses every option: all data files (with comments),
three speakers, a sponsor page, a timetable with a workshop spanning two slots, and placeholder images.
Preview it from this repo:

```bash
cd exampleSite && hugo server --themesDir ../..
```

## Starting a new edition

1. Create the site repo and copy `exampleSite/` into it (config, `data/`, `content/`, `static/`).
2. Point it at this theme (`theme = "devfest-hugo-theme"`) and run `hugo server --themesDir ..`
   with this repo checked out next to it.
3. Update `config.toml`: `baseURL`, `title`, `params.description`, `params.logo`, venue.
4. Update the data files top to bottom: `hero`, `facts`, `feature`, `cfp`, `sponsor`, `partner`,
   `travel`, `onTheDay`, `gallery` (add last year's album and website), `footer`.
5. Until the programme is public, set `enable: false` in `sessions.yml`; the site shows `comingSoon.yml`.
6. When the schedule is ready, fill `sessions.yml` and add one `content/speakers/<slug>.md` per speaker.
   Check the live view with `/?now=<event date>T11:00:00%2B02:00`.
7. Replace the placeholder images in `static/images/` and delete example speakers and sponsors.
8. Re-check travel info and every external link: it changes from year to year.

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
| `gallery.yml` | `galleryImage: [{image, alt}]` (home "Past editions" photos + hero mosaic), `albums: [{year, url, website?, cover?, color?}]` (past editions page; a `website` equal to the site's own baseURL is hidden) |
| `cfp.yml` | CFP band: `title`, `subtitle`, `buttonLabel`, `buttonTarget`, optional `deadline` |
| `ticket.yml` | When enabled, the main call to action becomes "Reserve a seat" (`itemPrices[0].buttonTarget`). While tickets are not ready, `soon: true` turns it into "Tickets open soon" (override with `soonLabel`) linking to `soonTarget` (default `/follow/`) |
| `follow.yml` | `/follow/` page: optional `subtitle` and `channels: [{label, url, description}]`. Page title comes from the theme's `content/follow/_index.md` |
| `footer.yml` | `columns: [{title, links: [{label, url}]}]`, optional `socials: [{label, url}]` and `socialsTitle` |

Colours are one of `blue`, `red`, `yellow`, `green`, `ink`.

### Live features

On the event day the home page shows a "Live now" bar and replaces the track cards in the Program
section with "Now & next" (from an hour before the first session until the last one ends). It runs on
the visitor's clock. Preview it at any time with `?now=`, e.g. `/?now=2026-10-24T11:00:00%2B02:00`.
The agenda accepts `?track=<name>` to open with a track selected.

"Save" and "My agenda" use the browser's localStorage only: no account and no sync. The agenda shows
a notice when "My agenda" is open, and the first save explains the same in a short message.

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

`start`, `end` and `room` are optional. A session without `start`/`end` counts as announced but not
scheduled: it still gets a talk page and appears on speaker pages and under "Announced talks" on the
agenda, but not in the timetable, the live bar or "My agenda", and it has no Save button. Add the
times when the schedule is ready and it becomes a normal session.

## Speakers (`content/speakers/<slug>.md`)

```yaml
name: "Jane Doe"
role: "Android GDE"               # `jobTitle` also works
photo: "/images/speakers/jane-doe.webp"
badge: "GDE"                      # optional
featured: true                    # home page picks six of these at random per visit
weight: 1                         # order on the speakers page; fallback order without JS
linkedin: "…"
bluesky: "…"
github: "…"
twitter: "…"
website: "…"
```

Note: Hugo reserves `lang` in front matter; use `talkLang` for the talk language when a speaker has no scheduled session.

The home page shows six speakers picked at random on each visit (JS). If any speaker has
`featured: true`, only those enter the random pool; otherwise all speakers do. Without JS the
first six by `weight` are shown.

The body is the bio (a `bio` front matter field also works).
