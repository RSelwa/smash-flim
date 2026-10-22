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

ELO uses K = 32: `change = round(32 × (1 − expected))`, where
`expected = 1 / (1 + 10^((loser − winner) / 400))`. The winner gains what the
loser drops. Every match stores both ratings before the game, so the history
and the per-player chart are exact.

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
| `pnpm start`     | serves `dist/` and the API on `PORT`    |

The database lives in `data/smash.db` by default (`DATABASE_PATH` overrides it).
Schema changes are numbered migrations in `server/db.ts`, tracked with
`pragma user_version`: append one, never edit a shipped one.

Character portraits in `public/characters/` are the Super Smash Bros. Ultimate
fighter thumbnails from smashbros.com, cropped to 128 px WebP. They are
Nintendo's artwork: fine for an internal tool, keep the repo private.

## Deploy to the home server

Every push to `main` runs `.github/workflows/deploy.yml`: install, lint, test
and build on GitHub, then ship a ready-to-run release (front build, server, and
production `node_modules`) to `/var/www/smash-flim` with rsync. On the server,
`docker compose` runs that folder in a stock `node:24-alpine` container: nothing
is built there. The job fails if `/api/players` does not answer after restart.

GitHub settings (repo level, or the `production` environment):

| kind     | name                  | value                                    |
| -------- | --------------------- | ---------------------------------------- |
| variable | `HOME_SERVER_HOST`    | host or IP the runner can SSH into       |
| variable | `HOME_SERVER_USER`    | SSH user that runs Docker                |
| secret   | `HOME_SERVER_SSH_KEY` | private key whose public half is allowed |

One-time setup on the server: Docker with the compose plugin, `rsync`, `curl`,
and a deploy folder the SSH user owns:

```sh
sudo mkdir -p /var/www/smash-flim && sudo chown "$USER" /var/www/smash-flim
```

The SQLite database lives in `/var/www/smash-flim/data`. Deploys never touch
it. The app listens on `127.0.0.1:3010` only; nginx serves it on
`flim-smash.raphael-selwa.com` with `deploy/nginx/flim-smash.raphael-selwa.com.conf`:

1. DNS: `flim-smash` CNAME to the box's DuckDNS name (the public IP changes).
2. Bbox: forward TCP 80 and 443 to `192.168.1.109`. Nothing else may already
   listen on them on the box (the Caddy, if still running).
3. On the box:

   ```sh
   sudo cp flim-smash.raphael-selwa.com.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/flim-smash.raphael-selwa.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d flim-smash.raphael-selwa.com --redirect
   ```

   certbot adds the HTTPS server and the HTTP → HTTPS redirect to the file, and
   its timer renews the certificate.

**The app has no login**, so anyone who reaches the URL can add players and
report results. To lock it, add `auth_basic` to the nginx server block.

Backup, from `/var/www/smash-flim`:
`docker compose exec smash-flim node -e "require('node:sqlite').backup(new (require('node:sqlite').DatabaseSync)('/app/data/smash.db'), '/app/data/backup.db')"`.

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
