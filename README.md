# Brandon Stryker Portfolio, Next.js 14, App Router

A clean one page portfolio starter tailored for a software engineer and Cisco instructor profile.

## Features

- Next.js App Router, TypeScript
- Tailwind CSS for styling
- Sections for Home, About, Skills, Teaching, Projects, Contact
- Simple API example at `/api/hello`

## Quickstart

```bash
pnpm i # or npm i or yarn
pnpm dev # or npm run dev or yarn dev
```

Open http://localhost:3000

## Customize

- Update content in `app/page.tsx`
- Update styles in `app/globals.css`
- Replace social links and email in the Contact section
- Add your own projects in the Projects grid

## Password-protected game hosting

In `.env.local` and Vercel's environment variables, configure:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
HOST_PW=your-host-password
SUPABASE_SECRET_KEY=your-supabase-secret-key
```

`HOST_PW` is the shared password required to create a room. Use the exact variable
name, including the hyphen. `SUPABASE_SECRET_KEY` is a server-only Supabase secret
key (a legacy service-role key also works). Never prefix either secret with
`NEXT_PUBLIC_`, commit them, or expose them in client code. Restart local development
after changing environment variables; redeploy Vercel after updating them there.

Deploy `supabase/migrations/20261105000200_password_protected_hosting.sql` alongside
the endpoint change. It removes the original browser-callable hosting function and
permits room creation only through the server's privileged client. Existing room
membership and joining by room key do not require the host password.

Run hosting and database checks with:

```bash
node --test tests/host-password.test.cjs tests/game-rooms.test.cjs
```

## Tic Tac Toe and Connect Four

Hosts can select a game in `/games/lobby`; landing-page cards preselect each game.
Both strategy games require exactly two players. The host is X/red and moves first.
The existing host password and guest room-key flow apply to both games.

Deploy `supabase/migrations/20261105000300_two_player_games.sql` to the shared
Supabase database before testing these games. It adds game selection, persistent
boards, server-validated moves, win/draw detection, and a two-player capacity limit.
Existing rooms retain Chutes and Ladders rules and capacity. No new environment
variables are required. As with previous migrations, apply it through the configured
migration workflow and keep its history recorded; changing Git branches alone does
not apply database migrations.

```bash
node --test tests/game-rooms.test.cjs tests/host-password.test.cjs tests/two-player-games.test.cjs
```

## Candy Land and shared chance animations

Deploy `supabase/migrations/20261105000400_candy_land_and_shared_reveals.sql`
for Candy Land and the Chutes and Ladders spinner. No additional environment
variables are needed. Candy Land supports 2–8 players and uses a 60-space rainbow
path followed by a finish castle, plus 36 single-color and 12 double-color cards.
The server stores the shuffled deck privately and reshuffles only when exhausted.
This first version uses color cards without special destination cards or shortcuts.

Each draw/spin publishes a unique event with shared start/end timestamps. Connected
clients reveal the same card or spinner result and then show the piece's new position.
The database prevents another chance move until the reveal finishes. Reconnecting
clients restore the latest result without replaying completed reveals. Reduced-motion
users see the result without the flip/spin motion.

```bash
node --test tests/candy-spin.test.cjs tests/game-rooms.test.cjs tests/two-player-games.test.cjs tests/host-password.test.cjs tests/game-room-compatibility.test.cjs
```

## Keep the party together

Deploy `supabase/migrations/20261105000500_party_game_switching.sql` to enable the
host's party game selector. In the lobby or after a finished game, the host can
choose another game without changing the room key or player seats. The new game
opens in the waiting state; the host starts it when everyone is ready. To switch
mid-game, return everyone to the lobby first. Tic Tac Toe and Connect Four are
disabled for parties larger than two; the database enforces the same capacity rule.

## Entry, party lobby, and game screens

`/games` now opens with “Do You Want to Play a Game?” and Host/Join choices.
Hosting collects a name and host password, then creates a party lobby; joining
collects a name and room key. Game selection happens inside the shared lobby.
Only playing/finished rooms show a board. The host's return-to-lobby action resets
the shared status to `waiting`, so all connected players see the lobby again.
Chat/video integrations are not included yet.

Tiny Learners lives at `/solo-games`; `/games/tiny-learners` redirects there.
Apply `20261105000600_party_lobby_capacity.sql` so waiting parties can gather up to
eight players regardless of their currently selected game. Starting Tic Tac Toe
or Connect Four still requires exactly two players.

## Party video chat

Apply `20261105000700_party_video_link.sql`. The host can expand **Add video chat**
in the room card, paste an existing Google Meet link, and share it with the party.
All room members then see **Open video chat**, which requests a separate window
and falls back to a normal new-tab link if the popup is blocked. Browser preferences
may open a tab instead. Each participant joins Google Meet themselves.

The host can edit/remove the link. The link is stored on the room, so it survives
lobby returns and game switches; removing it does not end an already-open call.
Only HTTPS `meet.google.com/abc-defg-hij` meeting links are accepted. There is no
Google OAuth setup, automatic call creation, or new environment variable required.

## Inactive party cleanup

Apply `20261105000800_inactive_party_cleanup.sql`. Successful host creation removes
only game rooms whose `last_active_at` is more than one hour old. Associated private
Candy Land decks are deleted by their foreign-key cascade. Other tables and guest
accounts are not cleared. Cleanup and creation are one transaction; if creation
fails, deletion rolls back. Rooms locked by another transaction are skipped.

Room mutations update activity automatically. Each connected game/lobby client
sends a heartbeat every minute, with database writes throttled to once per room
per minute and no game-version increments. Existing rooms receive a fresh timestamp
on migration. Cleanup is opportunistic when a new party is hosted, not a scheduled
job. An expired saved room returns the client to host/join with an explanatory
message instead of leaving it stuck reconnecting.

## Manual host cleanup

Apply `20261105000900_host_delete_other_parties.sql` for **Host tools → Delete all
other parties**. The host must confirm permanent deletion of every other room,
including active rooms and rooms created by other hosts. The current room is
explicitly excluded and locked during deletion; only its host may invoke the RPC.
Associated decks are deleted by cascade, but accounts and unrelated data remain.
The operation reports how many parties were deleted. It has no one-hour grace
period; automatic inactive cleanup remains a separate feature.

## Automatic database deployment

See [Database CI/CD](docs/database-deployment.md) for the GitHub Actions workflow,
the three required deployment secrets, and the one-time reconciliation of SQL
Editor migrations. PRs test the complete migration chain; merges to `main` apply
pending migrations automatically after checks pass. Vercel's website deployment
is separate. No manual SQL copy/paste is needed once history is reconciled.

## Game platform rebuild (read before deploying)

Migrations `20261105001000` through `20261105001600` (the last adds Memory) replace the earlier game tables and
functions with a generic platform: a `games` registry, a router (`game_action`) that does
the checks every game shares, and one small rules module per game. Adding a game no longer
means re-pasting a giant function. See [docs/game-platform.md](docs/game-platform.md) for
the design and the steps to add a game.

**`20261105001000_game_platform_rebuild.sql` drops and recreates `game_rooms`, so any
existing rooms are lost.** It is meant for a database with no live users. Apply all of
`1000`–`1600` together: the first migration removes the old functions and the later ones
recreate them.

Host removal ("Remove" next to a player in the lobby) is new. The `/api/games/host` endpoint
is unchanged.

```bash
node --test tests/*.test.cjs
```

The database tests run every migration in an in-process Postgres (PGlite), so they need no
Supabase project.
