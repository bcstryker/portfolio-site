# Game platform

How the multiplayer games work and how to add a new one. All rules run inside Postgres (Supabase); the browser
only calls RPCs and reads the room row. Migrations `20261105001000` onward define everything described here.

## Concepts

- **Room (party)**: one `game_rooms` row. It has a host, up to 8 players, a shared room key (`code`), and one
  currently selected game. The host can switch games without changing the key or players.
- **Player**: just `{id, name}` in `game_rooms.players` (a jsonb array). `id` is the Supabase Auth user id (an
  anonymous guest). A player's *seat* is their 0-based index in that array. Anything about a player *within a
  game* (piece positions, colors, hands) belongs in the game's `state`, keyed by player id, not on the player.
- **Game**: a row in `games` (id, name, min/max players, default options) plus two SQL functions (init, apply).

## Tables

| Table | Purpose | Client access |
|---|---|---|
| `games` | registry: id, name, `min_players`, `max_players`, `default_options` | read |
| `game_rooms` | the room (see below) | read, only for members (RLS) |
| `game_private` | hidden per-room data (decks, shuffles, secret hands): `{room_id, data}` | none |

`game_rooms` columns shared by every game: `code`, `host_id`, `game_type`, `players`, `status`
(`waiting` / `playing` / `finished`), `turn_index` (a seat), `winner_id`, `version`, `turn_ready_at`, `meet_url`,
`banned`, and the two game-owned columns:

- **`options`**: settings chosen in the lobby (board size, theme, etc.). Set at hosting / game selection; does
  not change during play.
- **`state`**: public game state that changes during play. Empty (`{}`) while the room is `waiting`; filled in by
  the game's init function at `start`; cleared on `reset`.

Everything in `game_rooms` is readable by room members, including through realtime. **Never put secrets in
`state` or `options`.** Put them in `game_private`.

## State conventions

`state` is owned by each game; the router never reads it. By convention it may contain:

- `board`: what lives at locations (cell values, terrain, layout).
- `pieces`: individual tokens with their own identity: `[{id, owner (player id), space, ...}]`. `space` can be
  anything the game needs (an int, `{row, col}`, `"start"`).
- `last_move`: a description of the latest move for the UI. Games with an animation include `event_id`,
  `started_at` and `ends_at`.
- `winning_cells` and similar highlight data.

Store each fact once. A game that uses both `board` and `pieces` must not record the same position in both.
Tic Tac Toe and Connect Four use only `board`; Chutes and Ladders and Candy Land use only `pieces`.

## The router: `game_action(room_id, action, expected_version, payload)`

Every in-game request goes through this one function. It locks the room row and then:

1. requires the caller to be a member, and `expected_version` to equal the room's `version` (optimistic
   concurrency; the client re-reads and retries on "The room changed");
2. handles the **common actions** itself:
   - `start` (host, room `waiting`): checks the player count against the game's `min_players`/`max_players`, calls
     the game's init function, and sets status `playing`.
   - `reset` (host, any time): back to `waiting`, empty `state`, hidden data deleted.
   - `kick` (host, `waiting` only): payload `{"player_id": "<uuid>"}`; removes the player and bans that id.
3. for anything else, requires status `playing`, `seat = turn_index`, and `turn_ready_at` to be in the past,
   then calls the game's apply function with the action and payload.
4. writes the returned `game_result` and bumps `version`.

Games therefore never check membership, turn order, versions, host rights or animation timing. They only
validate their own action names and payloads, and raise an exception with a friendly message for bad moves.

Other RPCs: `join_game(room_key, display_name)`, `change_party_game(room_id, selected_game, expected_version,
game_options)`, `set_party_video(room_id, meeting_url, expected_version)`. `host_game(display_name,
host_user_id, selected_game, game_options)` is callable only by the server (service role) from
`/api/games/host`, after the host password is checked.

## The game contract

Two functions per game, named with underscores (`candy-land` -> `candy_land`):

```sql
game_<id>_init(options jsonb, players jsonb) returns game_result
game_<id>_apply(room game_rooms, private jsonb, seat integer, action text, payload jsonb) returns game_result
```

`game_result` is `(state, private, turn_index, status, winner_id, turn_ready_at)`. The router writes every
field exactly as returned, so `apply` must return the room's current value for anything it does not change
(for example `room.turn_ready_at`, `room.turn_index`).

- `init` receives the room's `options` and the `players` array (use it to create per-player pieces) and returns
  the starting state. Return `private` to create hidden data (a shuffled deck); `null` means none. Status is
  normally `playing` and `turn_index` 0. It must validate `options` and raise if they are invalid.
- `apply` receives the locked room row, the hidden data (`{}` if none), the acting player's seat, the action name
  and payload. Return the new state. Return a non-null `private` to replace the hidden data, or `null` to leave
  it unchanged. Set `status` to `finished` and `winner_id` when the game ends (`winner_id` null = draw).
- Animations: set `turn_ready_at` to a time in the future; the router refuses the next move until then.
- Randomness: use `random()` / `gen_random_uuid()` on the server. Never accept random values from the client.
- Mark functions `immutable` only if they truly are (no `random()`, no clock). Revoke execute from
  `public, anon, authenticated`; only the router (a `security definer` function) calls them.

## Adding a game

1. **Migration**: insert into `games` (id, name, min/max players, `default_options`), then define the two
   functions above, and revoke execute on them from `public, anon, authenticated`.
2. **Dispatchers**: in the same migration, `create or replace` `game_init` and `game_apply` (see
   `20261105001100_game_router.sql`) to add one `elsif` line each. They use `if/elsif`, not `CASE`, so a game
   whose functions are missing cannot break the others.
3. **TypeScript**: add the game to `lib/games.ts` (name, player limits, rules text) and write its board
   component under `app/games/lobby/`, reading `room.state` / `room.options`.
4. **Tests**: add rules tests (see below).

## Worked example: Memory

`20261105001600_game_memory.sql` is the first game written against this platform and shows each extension point:

- **Options**: board size, card set and hard mode arrive in `options`; `game_memory_init` validates them and
  raises if they are bad, so errors appear when the host starts the game.
- **Hidden state**: the shuffled deck is in `game_private`; only flipped cards are copied into `state.board`.
- **Data owned by the game**: card sets live in their own table (`memory_sets`) read by the client and by the
  rules. Pictures are static files under `public/memory/<set>/<card id>.png`.
- **Dispatchers**: the migration ends with `create or replace` of `game_init` and `game_apply` adding one line each.
- **UI**: `app/games/lobby/memory.tsx` renders the board; the lobby shows a settings panel for the host.

## Testing

Run the migrations in order against a throwaway Postgres (for example `podman run postgres:16`) with a small
stub for Supabase (`auth.users`, `auth.uid()` reading `request.jwt.claim.sub`, the roles `anon`,
`authenticated`, `service_role`, and an empty `supabase_realtime` publication). Then drive a game by calling
`game_action` while setting `request.jwt.claim.sub` to each player's id. Useful checks: wrong turn, bad payload,
stale version, move after finish, win and draw, and that hidden data never appears in `state`.

## Security notes

- RLS lets members read their own room only; there are no insert/update/delete grants on any table.
- Players are anonymous Auth users, which anyone can replace by clearing browser data. `kick`/`banned` stops
  casual rejoining; it is not a strong ban. Captcha on anonymous sign-ins and a lockable room would harden it.
- Room creation requires the host password (`HOST_PW`) and is limited to 10 rooms per hour per guest id.
- Known gaps worth closing: a global cap on live rooms, a scheduled cleanup of old rooms, per-user rate limits
  on `join_game` attempts, and a minimum interval between actions.
