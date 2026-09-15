# AGENTS.md — DevFest Hugo theme

Shared theme for the GDG Venezia DevFest websites. It is consumed by each edition's site as a git
submodule in `themes/devfest-hugo-theme` (currently `GDG-Venezia/devfest26`). A change here reaches a
site only when that site bumps its submodule.

## What belongs here

- Layouts, partials, CSS (`assets/css/devfest.css`), JS (`assets/js/site.js`), section pages and the
  talk-page generator (`content/agenda/_content.gotmpl`).
- Nothing edition-specific: no real dates, speakers, sponsors or copy for one year. Those go in the
  site's `data/` and `content/`.

## Rules for changes

- **Stay compatible with existing sites.** New data fields are optional with sensible defaults;
  don't rename or remove fields without updating every site that uses them. The theme also accepts
  older formats (`jobTitle`, speaker `bio` front matter, a flat sponsor `partner:` list): keep them working.
- **Document every data change** in the same commit:
  - `README.md` (data file table and examples),
  - `exampleSite/` (add the field with a short comment so a new edition sees it).
- **Hugo version:** sites build in CI with Hugo **0.152.2** extended; minimum declared is 0.126.
  Don't use newer features (for example `hugo.Data`; use `site.Data`).
- Hugo's template escaping rejects some values in `style` attributes (you get `ZgotmplZ`): use a
  CSS class instead of computed values like `grid-column: 2 / -1`.
- Keep the page usable without JavaScript; the script only enhances (filters, saved agenda, live view).
- Text visible to visitors is plain English, and saved-agenda messaging must keep saying it is
  stored on this device only.

## Checks before handing off

```bash
cd exampleSite && hugo --themesDir ../..        # builds with every option in use
```

- Also build and preview at least one real site that uses the theme (from the site:
  `hugo server`, or `hugo server --themesDir ..` against this checkout).
- Check desktop and ~375px width. For agenda and live changes use data with sessions
  (`exampleSite`, or a site with `sessions.yml` enabled) and `/?now=<date>T11:00:00%2B02:00`.

## Releasing a change

1. Commit and push `main` here (only when the user asks to push).
2. In each site that should get it: bump the submodule, build, commit "Bump theme: …", push.
   Pushing a site deploys it.
3. Tell the user which sites were bumped and which were not.
