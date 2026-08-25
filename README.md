# Cool Tech People — Site Source

This replaces the old workflow (hand-writing a full HTML file per person, and
hand-editing two separate hardcoded JS arrays) with one source of truth per
profile and a build script that generates the whole site.

## IMPORTANT — before you do anything else

The `images/` folder in this project is EMPTY. I never had access to your
actual headshot photo files — only their filenames, read out of your old
site's code. Copy your existing headshots from your current live
repo/site into this project's `images/` folder before running the build,
using the same filenames they already have (e.g.
`andy-rivas-headshot.jpg`) — that's what each profile's JSON file already
points to.

## How to add a new profile going forward

1. Copy `data/profiles/andy-rivas.json` as a starting template, rename it
   `firstname-lastname.json`, and fill in their info. Every field is
   documented by example in the existing files — `expertise` is a map of
   category → list of tags, `projects` is a list of `{title, desc}`.
2. Drop their headshot in `images/` — filename should match what you put in
   the JSON's `"photo"` field (convention: `firstname-lastname-headshot.jpg`).
3. Run:
   ```
   node build.js
   ```
4. Check `/dist` — that's the entire deployable site. Commit and push it (or
   point your Vercel build command at `node build.js` so it regenerates on
   every deploy — see below).
5. Done. Their profile page, their directory card, and their entry in the
   featured-professionals rotation on the homepage are now all live, all
   generated from the one JSON file, and can never drift out of sync with
   each other again.

## Project structure

```
/data/profiles/*.json     ← ONE JSON FILE PER PERSON. This is the only
                             place you ever hand-edit profile content.
/templates/                 profile.template.html — the HTML shape every
                             profile page is generated from.
/static/                    Hand-authored page shells that don't change
                             per-profile: index.html, directory.html,
                             about.html. Copied to /dist as-is.
/images/                    Headshots. EMPTY in this download — see above.
styles.css                  ALL site CSS, in one file, shared by every page.
build.js                    The generator. Run with `node build.js`.
/dist/                      Generated output — this is what gets deployed.
                             Don't hand-edit anything in here; it gets
                             overwritten on every build.
```

## Wiring this into Vercel

In your Vercel project settings, set the Build Command to:
```
node build.js
```
and the Output Directory to `dist`. Vercel will run the generator on every
push and deploy the result — so once a JSON file + photo are committed to
the repo, everything else is automatic.

## Bugs this fixed along the way

- `luke-lay-profile.html` and `siv-sands-profile.html` were missing the
  `--accent` CSS variable in their `:root` block in the original site,
  which meant their expertise tags were rendering without their orange
  background/border. Now impossible — there's only one `:root` definition,
  in `styles.css`, shared by every page.
- `index.html` and `directory.html` used to each hardcode their own
  separate copy of every profile's data (three total copies of most
  fields, including the profile page itself). Now there's one:
  `profiles-data.js`, generated from the JSON files and included by both
  pages via `<script src="profiles-data.js">`.
- A few individual profile pages had inconsistent `<div>` closing before
  `</body>` (a stray `</d`). The template always closes correctly.
- Jeff Daniels' and Luke Lay's "Based In" contact field didn't match their
  directory card location — I preserved this via a `locationOverride`
  field per-profile (contact section shows what the person told you
  directly; directory filtering uses `city`/`region`). Worth confirming
  with them which is actually accurate.

## Note on the "Get In Touch" link on About

The original mailto link used Cloudflare's email-obfuscation format
(`/cdn-cgi/l/email-protection#...`), which only decodes correctly when
served through Cloudflare's actual proxy — it was non-functional as a
static file outside that environment, and the source was truncated anyway.
I swapped it for a plain `mailto:hello@cooltechpeople.com` as a placeholder
— swap in your real inbox address.
