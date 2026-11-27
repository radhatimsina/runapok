# Rup Creations

Poems and stories by **Rup Pokharel**, moved from the old WordPress blog
(runapok.wordpress.com) to a fast, low-maintenance site.

- **Astro** static site, hosted on **Vercel**
- **Decap CMS** at `/admin/` for writing new poems (no code needed)
- **Comments** stored in a **Neon Postgres** database (connected through Vercel)
- All 44 old posts and 30 old comments imported with their **original dates**
- Old addresses keep working: posts are still at `/YYYY/MM/DD/slug/`, and
  `/category/poems/`, `/about/` and `/feed/` still exist

## What's where

| Path | What it is |
| --- | --- |
| `src/content/writings/` | One Markdown file per poem or story. The file name sets the address: `2016-03-21-colors-in-happiness.md` → `/2016/03/21/colors-in-happiness/` |
| `src/content/pages/about.md` | The About page |
| `public/images/wp/` | Images from the old blog. New uploads go to `public/images/uploads/` |
| `public/admin/` | Decap CMS (the writing desk) |
| `src/pages/api/comments.ts` | Comments API (read and post) |
| `src/pages/api/auth.ts`, `callback.ts` | GitHub sign-in for Decap CMS |
| `db/schema.sql`, `db/legacy-comments.json` | Comments table and the old comments |
| `scripts/import-wordpress.mjs` | The one-off WordPress importer (already run) |

## One-time setup on Vercel

### 1. Deploy

1. In Vercel, choose **Add New → Project** and import `radhatimsina/runapok`.
   Vercel detects Astro, so you don't need to change any settings.
2. Deploy. The site will be at `https://runapok.vercel.app`, or at a similar
   address if that one is taken. If the address differs, set `SITE_URL` (step 4)
   and update `site_url` in `public/admin/config.yml`.

### 2. Database for comments

1. In the Vercel project, go to **Storage → Create Database → Neon (Postgres)**
   and connect it to the project. Vercel adds `DATABASE_URL` for you.
2. Redeploy. Every build creates the comments table if needed and loads the
   30 old WordPress comments that aren't there yet (`scripts/db-setup.mjs`).
   It is safe to repeat, and a database problem never stops the deploy.
   To do it by hand instead, paste `db/schema.sql` and then
   `db/legacy-comments.sql` into the Neon SQL editor.

### 3. Sign-in for the writing desk (Decap CMS)

Decap saves each poem as a commit in this GitHub repository, so the author
needs a GitHub account with write access to it (repository **Settings →
Collaborators**).

1. On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**:
   - Homepage URL: `https://runapok.vercel.app`
   - Authorization callback URL: `https://runapok.vercel.app/api/callback/`
2. Copy the **Client ID**, then generate a **Client secret**.

### 4. Environment variables (Vercel → Settings → Environment Variables)

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Added automatically in step 2 |
| `GITHUB_CLIENT_ID` | From step 3 |
| `GITHUB_CLIENT_SECRET` | From step 3 |
| `AUTHOR_PASSCODE` | Any long phrase. The author enters it under "Are you the author?" so their replies show an **Author** badge |
| `COMMENT_SALT` | Optional: any random text |
| `COMMENTS_REQUIRE_APPROVAL` | Optional: `true` holds every new comment until you approve it |
| `SITE_URL` | Only if the site's address isn't `https://runapok.vercel.app` |

Redeploy after adding them.

## Publishing a new poem

1. Go to `https://runapok.vercel.app/admin/` and sign in with GitHub.
2. Under **Poems & Stories**, choose **New Poem or story**.
3. Fill in the title, type (poem or story), language (English or नेपाली) and the text.
   Type each line on its own line and leave an empty line between stanzas.
4. If the same poem is also on **Bhutanese Literature**, paste that link into
   **Also published on Bhutanese Literature**. The page will then show a link to it.
5. Click **Publish**. The site rebuilds in about a minute.

Tick **Draft** to save a piece without showing it on the site.

## Adding a page (About, Books, Contact…)

1. In `/admin/`, open **Pages** and choose **New Page**.
2. Give it a title. The address comes from the title the first time it's saved
   (for example "My Books" becomes `/my-books/`).
3. Tick **Show in the top menu** to add it to the menu, and use **Menu position**
   to order it (About is 10, smaller numbers come first).
4. Optionally add a header picture, turn on comments, or tick **Draft** to keep
   it hidden while you work on it. Click **Publish**.

A few names are taken by the site itself and can't be used for pages:
admin, api, category, language, images, feed, tag, author and plain years like 2016.

## Listening to a poem

Every poem and story has a **Listen** button.

- **Author's recording:** in `/admin/`, open the piece and upload an MP3 in
  **Audio recording** (under 10 MB). The page then plays that recording.
- **Read aloud automatically:** without a recording, the visitor's own device
  reads the text, highlighting each line. It's free and nothing is sent to a
  server. Voice quality depends on the device. Nepali pieces use a Nepali voice
  if the device has one, otherwise a Hindi voice; if neither is installed the
  button says so.

## Picture finder in the writing desk

The **Picture** field (poems and pages) has a **✨ Suggest pictures** button:

- **Free photos:** AI reads the poem (English or Nepali), suggests search words, and
  searches Pexels, Pixabay and Openverse (Wikimedia Commons, Flickr Creative Commons,
  museums). Only licences that allow reuse are shown. "Use this" crops the photo to
  1280×720, saves it to `public/images/uploads/` and credits the photographer under the
  picture on the site.
- **Create with AI:** makes 2 painterly pictures from a description (about 1¢ each).
- **Upload my own** works as before.

Only people signed in to the writing desk with write access to the GitHub repo can use it.

### Setup (Vercel → Settings → Environment Variables)

| Name | Needed for | Where to get it |
| --- | --- | --- |
| `PEXELS_API_KEY` | Pexels photos | Free: pexels.com/api |
| `PIXABAY_API_KEY` | Pixabay photos | Free: pixabay.com/api/docs (sign in, key shown on the page) |
| `OPENVERSE_CLIENT_ID`, `OPENVERSE_CLIENT_SECRET` | Optional: higher Openverse limits | Free; works without them at a lower rate |
| `AI_MONTHLY_BUDGET_CENTS` | Optional: AI spending cap (default `100` = $1/month) | |

AI (search ideas and created pictures) uses **Vercel AI Gateway**. Turn it on in the
Vercel dashboard (AI Gateway tab); on Vercel it signs in automatically. The site keeps
its own running total in the database and stops AI use once the monthly cap is reached;
setting the same $1 budget in AI Gateway adds a second safety net. Without AI Gateway,
photo search still works using the poem's title.

Optional overrides: `AI_TEXT_MODEL` (default `anthropic/claude-haiku-5.5`) and
`AI_IMAGE_MODEL` (default `bfl/flux-3-image-klein`), any IDs from
https://ai-gateway.vercel.sh/v1/models.

## If a published poem doesn't appear

Vercel's free plan only auto-deploys commits from GitHub accounts linked to the Vercel
account. Poems published from `/admin/` are committed by the author's GitHub account, so
either:

1. **Link that GitHub account to Vercel** (Vercel → Account Settings → Authentication →
   connect GitHub, signed in as the author's GitHub account), or
2. **Set up the deploy hook fallback:** Vercel → Project → Settings → Git → Deploy Hooks →
   create a hook for `main`, then add its URL in GitHub → Settings → Secrets and variables →
   Actions as `VERCEL_DEPLOY_HOOK`. The workflow `.github/workflows/deploy-on-publish.yml`
   then triggers a deploy after every publish.

## Comments

- Visitors only need a name. Email is not collected.
- Spam protection: a hidden honeypot field, a minimum time on the page, a limit
  of 5 comments per visitor every 10 minutes, and comments with more than two
  links held for approval.
- Only someone with `AUTHOR_PASSCODE` can post as "Rup Pokharel".
- To approve or remove a comment, open the Neon SQL editor (Vercel → Storage)
  and run, for example:
  ```sql
  SELECT id, post_id, author_name, status, left(body, 60) FROM comments ORDER BY created_at DESC LIMIT 20;
  UPDATE comments SET status = 'approved' WHERE id = 123;
  DELETE FROM comments WHERE id = 123;
  ```

## Local development

```bash
npm install
```
```bash
npm run dev
```

Comments need a database. Put `DATABASE_URL` in `.env` to try them locally.
Without one, the rest of the site works and the comments section shows a
"could not be loaded" message.
