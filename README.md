# Showstopper

**The best video of every concert.** Showstopper finds fan videos of recent shows and ranks them by views, full-show
length, and audio/video quality. Each one plays through the original platform's official embed (youtube-nocookie /
archive.org). Nothing is rehosted, and credit and links always go to the original uploader.

Live site: https://sjjansen24-agents.github.io/showstopper/

## What's in this repo
This repo holds the static site only: plain HTML/CSS/JS with no build step.
- `index.html`, `styles.css`, `theme.css`, `app.js`, `fade.js`: the app (hash routing)
- `social.js`, `social-supabase.js`: accounts, lists, tracking, comments, messages and play counts. They use Supabase when connected and fall back to localStorage.
- `ads.js`, `advertise/`: direct-sold ad slots and the /advertise page. Every ad is labeled Sponsored.
- `data.js`: catalog data, regenerated daily by a private ingest job
- `config.js`: the public Supabase URL and **anon** key only. Row-level security protects the data, and no private keys live here.
- `CREDITS.txt`: photo and data credits

## Takedowns
Every video is an embed from its original platform. Remove a video there and it disappears here too. To get a listing
removed from Showstopper, open an issue.
