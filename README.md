# Smash ELO

ELO ladder for the office Smash Bros sessions. Vite + React + shadcn/ui on the
front, Hono + SQLite (`node:sqlite`, built into Node) on the back. One process,
one SQLite file.

## How it works

1. **New player**: pick a name and a main. The main's portrait is the avatar.
   Both can be edited later from the player page. Everyone starts at 1000 ELO.
2. **Arena**: drag two fighters from the roster into the Player 1 / Player 2
   halves, then "Start match". Each half shows the ELO at stake.
3. **Report the winner**: click "<name> won" under "Ongoing matches".
   A pending match can be cancelled; a reported one cannot.
4. **Tournament**: drag the participants in, then "Draw bracket". Single
   elimination over the next power of two: the best ELO are seeded (#1 and #2
   in opposite halves) and get the byes, everyone else is drawn at random.
   Tournament matches are regular ELO matches, reported from the bracket or
   "Ongoing matches"; the winner moves up on their own. They cannot be
   cancelled.

ELO is refitted from the whole history after every result, not updated one
match at a time: the ratings are the ones that best explain every result
together (Bradley–Terry, on the ELO scale: `expected = 1 / (1 + 10^((opponent −
player) / 400))`). The order results came in no longer matters, so losing to the
best player before their level showed costs nothing extra. Two settings in
`server/elo.ts` shape it:

- `RATING_SPREAD = 250`: everyone starts at 1000 and needs results to move away
  from it, which keeps a 12–0 record finite.
- `HALF_LIFE_DAYS = 60`: a result counts half as much 60 days later, so
  progress shows.

A result can move players who did not play it, and the winner and loser no
longer move by the same amount. Every match stores each player's rating before
the game and their change.

Classic ELO is still computed alongside, in `players.classic_elo`: K = 32,
`change = round(32 × (1 − expected))`, the winner gains what the loser drops and
only the two players move. The rankings charts switch between the two with
"New ELO" / "Classic ELO"; everything else uses the new one.

## Develop

Requires Node ≥ 24 and pnpm.

```sh
pnpm install
pnpm dev        # Vite on :5173, API on :3000 (proxied under /api)
```

| script           | does                                    |
| ---------------- | --------------------------------------- |
| `pnpm typecheck` | `tsc -b` on front, server and configs   |
| `pnpm lint`      | oxlint                                  |
| `pnpm format`    | oxfmt                                   |
| `pnpm test`      | vitest — ELO maths + API against SQLite |
| `pnpm build`     | typecheck + Vite build into `dist/`     |
| `pnpm start`     | runs the API on `PORT` (default 3000)   |

The database lives in `data/smash-v2.db` by default (`DATABASE_PATH` overrides it).
`data/smash.db` is the frozen database of the incremental-ELO era. To build the
current one from it, copy it and replay every result through the rating fit:
`node server/seed-database.ts data/smash.db data/smash-v2.db` (it refuses to
overwrite an existing target).
Schema changes are numbered migrations in `server/db.ts`, tracked with
`pragma user_version`: append one, never edit a shipped one.

Character portraits in `public/characters/` are the Super Smash Bros. Ultimate
fighter thumbnails from smashbros.com, cropped to 128 px WebP. They are
Nintendo's artwork: fine for an internal tool, keep the repo private.

## Deploy to the VPS

```
browser ──► nginx  flim-smash.raphael-selwa.com
              ├─ /        → /var/www/smash-flim/dist   (Vite build)
              └─ /api/*   → 127.0.0.1:3010 → Node (pm2) → data/smash-v2.db
```

Every push to `main` runs `.github/workflows/deploy.yml`: install, lint, test
and build on GitHub, then rsync a ready-to-run release (Vite build, API, its
production `node_modules`, `ecosystem.config.cjs`) to `/var/www/smash-flim` on
the VPS and reload the API with pm2 (nvm Node 24.14.1). Nothing is built on the
server. The job fails if `/api/players` does not answer after the reload.

GitHub settings, in the `prod` environment:

| kind     | name              | value                                            |
| -------- | ----------------- | ------------------------------------------------ |
| variable | `VPS_HOST`        | `141.94.220.102`                                 |
| variable | `VPS_USER`        | `debian`                                         |
| secret   | `SSH_PRIVATE_KEY` | deploy key, its public half in `authorized_keys` |

The nginx site is `deploy/nginx/flim-smash.raphael-selwa.com.conf`, installed as
`/etc/nginx/sites-available/flim-smash.raphael-selwa.com`. HTTPS comes from
`sudo certbot --nginx -d flim-smash.raphael-selwa.com --redirect`, which adds
the TLS server and the redirect to that file; its timer renews the certificate.

The SQLite database lives in `/var/www/smash-flim/data`; deploys never touch it.
The API listens on `127.0.0.1:3010` only, so nginx is the one way in.

**The app has no login**, so anyone who reaches the URL can add players and
report results. To lock it, add `auth_basic` to the nginx server block.

Backup, from `/var/www/smash-flim`:
`node -e "require('node:sqlite').backup(new (require('node:sqlite').DatabaseSync)('data/smash-v2.db'), 'data/backup.db')"`.

## API

| method   | path                      | body                        |
| -------- | ------------------------- | --------------------------- |
| `GET`    | `/api/players`            | —                           |
| `POST`   | `/api/players`            | `{ name, character }`       |
| `PUT`    | `/api/players/:id`        | `{ name, character }`       |
| `GET`    | `/api/matches`            | `?status=&playerId=&limit=` |
| `POST`   | `/api/matches`            | `{ player1Id, player2Id }`  |
| `POST`   | `/api/matches/:id/winner` | `{ winnerId }`              |
| `DELETE` | `/api/matches/:id`        | — (pending matches only)    |
| `GET`    | `/api/tournaments`        | —                           |
| `POST`   | `/api/tournaments`        | `{ playerIds }`             |
