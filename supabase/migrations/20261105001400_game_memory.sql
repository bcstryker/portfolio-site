-- Memory (concentration) for the generic router.
-- Options (set when the host picks the game): {size: 4|6|8|10 (an n x n grid), genre: <memory_sets.id>,
--   showNames: true | false}. showNames=false is hard mode: each match opens a four-choice question about the
--   flag just matched, worth a bonus point.
-- state:   {board:  [n*n]  card id while face-up (or just matched), else null,
--           owner:  [n*n]  id of the player who took the card, else null,
--           up:     [idx]  cards flipped this turn (a missed pair stays face-up until the next flip),
--           shown:  [idx]  the last matched pair, kept face-up until the next flip,
--           mismatch, quiz: null | {player_id, card, options}, qres: null | {player_id, correct, card},
--           scores: {player id: points}}
-- private: {deck: [n*n card ids]}   (never readable by clients)
-- actions: 'flip' {"i": index}, 'answer' {"pick": card id}. A match keeps the turn; a miss passes it.
-- The card images are served from /memory/<genre>/<card id>.png by the app.

create table public.memory_sets (
  id text primary key,
  title text not null,
  cards jsonb not null check (jsonb_typeof(cards) = 'array')
);
alter table public.memory_sets enable row level security;
revoke all on public.memory_sets from public, anon, authenticated;
grant select on public.memory_sets to authenticated;
create policy "Signed-in players can read card sets" on public.memory_sets
  for select to authenticated using (true);

insert into public.memory_sets (id, title, cards) values ('flags', 'Flags of the world', '[
  {"id":"us","name":"United States"},{"id":"cn","name":"China"},{"id":"jp","name":"Japan"},{"id":"kr","name":"South Korea"},
  {"id":"in","name":"India"},{"id":"gb","name":"United Kingdom"},{"id":"fr","name":"France"},{"id":"de","name":"Germany"},
  {"id":"it","name":"Italy"},{"id":"es","name":"Spain"},{"id":"pt","name":"Portugal"},{"id":"ru","name":"Russia"},
  {"id":"ca","name":"Canada"},{"id":"mx","name":"Mexico"},{"id":"br","name":"Brazil"},{"id":"ar","name":"Argentina"},
  {"id":"au","name":"Australia"},{"id":"nz","name":"New Zealand"},{"id":"za","name":"South Africa"},{"id":"eg","name":"Egypt"},
  {"id":"ng","name":"Nigeria"},{"id":"ke","name":"Kenya"},{"id":"sa","name":"Saudi Arabia"},{"id":"tr","name":"Turkey"},
  {"id":"gr","name":"Greece"},{"id":"nl","name":"Netherlands"},{"id":"be","name":"Belgium"},{"id":"ch","name":"Switzerland"},
  {"id":"se","name":"Sweden"},{"id":"no","name":"Norway"},{"id":"dk","name":"Denmark"},{"id":"fi","name":"Finland"},
  {"id":"pl","name":"Poland"},{"id":"ua","name":"Ukraine"},{"id":"ie","name":"Ireland"},{"id":"il","name":"Israel"},
  {"id":"ir","name":"Iran"},{"id":"pk","name":"Pakistan"},{"id":"id","name":"Indonesia"},{"id":"th","name":"Thailand"},
  {"id":"vn","name":"Vietnam"},{"id":"ph","name":"Philippines"},{"id":"sg","name":"Singapore"},{"id":"my","name":"Malaysia"},
  {"id":"co","name":"Colombia"},{"id":"cl","name":"Chile"},{"id":"pe","name":"Peru"},{"id":"cu","name":"Cuba"},
  {"id":"ma","name":"Morocco"},{"id":"et","name":"Ethiopia"}
]'::jsonb);

insert into public.games (id, name, min_players, max_players, default_options)
values ('memory', 'Memory', 2, 2, '{"size": 6, "genre": "flags", "showNames": true}');

create function public.game_memory_init(options jsonb, players jsonb)
returns public.game_result language plpgsql volatile set search_path = '' as $$
declare
  size integer;
  cells integer;
  card_set public.memory_sets%rowtype;
  ids text[];
  pairs text[];
  deck text[];
  empty jsonb;
begin
  if jsonb_typeof(options -> 'size') is distinct from 'number' then raise exception 'Choose a board size of 4, 6, 8 or 10.'; end if;
  if (options ->> 'size')::numeric not in (4, 6, 8, 10) then raise exception 'Choose a board size of 4, 6, 8 or 10.'; end if;
  if jsonb_typeof(options -> 'showNames') is distinct from 'boolean' then raise exception 'Choose whether to show card names.'; end if;
  select * into card_set from public.memory_sets where id = options ->> 'genre';
  if not found then raise exception 'Choose a card set.'; end if;
  size := (options ->> 'size')::integer;
  cells := size * size;
  if cells / 2 > jsonb_array_length(card_set.cards) then
    raise exception 'That card set does not have enough cards for a %x% board.', size, size;
  end if;
  ids := array(select c ->> 'id' from jsonb_array_elements(card_set.cards) as c);
  pairs := array(select x from unnest(ids) as x order by random() limit cells / 2);
  deck := array(select x from unnest(pairs || pairs) as x order by random());
  empty := to_jsonb(array_fill(null::text, array[cells]));
  return row(
    jsonb_build_object('board', empty, 'owner', empty, 'up', '[]'::jsonb, 'shown', '[]'::jsonb, 'mismatch', false,
      'quiz', null, 'qres', null,
      'scores', (select jsonb_object_agg(p ->> 'id', 0) from jsonb_array_elements(players) as p)),
    jsonb_build_object('deck', to_jsonb(deck)),
    0, 'playing', null, null
  )::public.game_result;
end;
$$;

create function public.game_memory_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql volatile set search_path = '' as $$
declare
  player_id text := room.players -> seat ->> 'id';
  deck jsonb := private -> 'deck';
  board jsonb := room.state -> 'board';
  owner jsonb := room.state -> 'owner';
  scores jsonb := room.state -> 'scores';
  quiz jsonb := room.state -> 'quiz';
  qres jsonb := 'null'::jsonb;
  mismatch boolean := (room.state ->> 'mismatch')::boolean;
  up integer[] := array(select v::integer from jsonb_array_elements_text(room.state -> 'up') as v);
  shown integer[] := array(select v::integer from jsonb_array_elements_text(room.state -> 'shown') as v);
  cells integer := jsonb_array_length(room.state -> 'board');
  idx_input numeric;
  idx integer;
  a integer;
  b integer;
  other integer;
  card text;
  options text[];
  pick text;
  correct boolean;
  next_turn integer := seat;
  next_status text := 'playing';
  winner uuid;
  top_a integer;
  top_b integer;
begin
  if action = 'flip' then
    if jsonb_typeof(quiz) = 'object' then raise exception 'Answer the flag question first.'; end if;
    if jsonb_typeof(payload -> 'i') is distinct from 'number' then raise exception 'Choose a card.'; end if;
    idx_input := (payload ->> 'i')::numeric;
    if idx_input <> trunc(idx_input) or idx_input < 0 or idx_input >= cells then raise exception 'Choose a card.'; end if;
    idx := idx_input::integer;

    -- The previous turn's missed pair is hidden again by the next flip.
    if cardinality(up) = 2 then
      foreach other in array up loop board := jsonb_set(board, array[other::text], 'null'::jsonb); end loop;
      up := '{}';
      mismatch := false;
    end if;
    if jsonb_typeof(owner -> idx) = 'string' or idx = any(up) then raise exception 'That card is already face up.'; end if;
    -- The previous match disappears now.
    foreach other in array shown loop board := jsonb_set(board, array[other::text], 'null'::jsonb); end loop;
    shown := '{}';

    up := array_append(up, idx);
    board := jsonb_set(board, array[idx::text], to_jsonb(deck ->> idx));
    if cardinality(up) = 2 then
      a := up[1]; b := up[2];
      if deck ->> a = deck ->> b then
        owner := jsonb_set(jsonb_set(owner, array[a::text], to_jsonb(player_id)), array[b::text], to_jsonb(player_id));
        scores := jsonb_set(scores, array[player_id], to_jsonb((scores ->> player_id)::integer + 1));
        up := '{}';
        shown := array[a, b];
        if (room.options ->> 'showNames')::boolean = false then
          -- Hard mode: a four-choice question about the flag just matched.
          card := deck ->> a;
          options := array(select x from unnest(
              array(select c ->> 'id' from public.memory_sets s, jsonb_array_elements(s.cards) as c
                    where s.id = room.options ->> 'genre' and c ->> 'id' <> card order by random() limit 3) || card) as x
            order by random());
          quiz := jsonb_build_object('player_id', player_id, 'card', card, 'options', to_jsonb(options));
        end if;
      else
        mismatch := true;
        next_turn := (seat + 1) % jsonb_array_length(room.players);
      end if;
    end if;

  elsif action = 'answer' then
    if jsonb_typeof(quiz) is distinct from 'object' then raise exception 'There is no question to answer.'; end if;
    if quiz ->> 'player_id' <> player_id then raise exception 'That question is not yours to answer.'; end if;
    if jsonb_typeof(payload -> 'pick') is distinct from 'string' then raise exception 'Choose an answer.'; end if;
    pick := payload ->> 'pick';
    if not (pick = any(array(select jsonb_array_elements_text(quiz -> 'options')))) then raise exception 'Choose one of the listed answers.'; end if;
    correct := pick = quiz ->> 'card';
    if correct then scores := jsonb_set(scores, array[player_id], to_jsonb((scores ->> player_id)::integer + 1)); end if;
    qres := jsonb_build_object('player_id', player_id, 'correct', correct, 'card', quiz ->> 'card');
    quiz := 'null'::jsonb;

  else
    raise exception 'Unknown action.';
  end if;

  -- Game over when every card is taken (and no question is pending): most points wins, equal points is a draw.
  if jsonb_typeof(quiz) is distinct from 'object'
     and not exists (select 1 from jsonb_array_elements(owner) as o where jsonb_typeof(o) = 'null') then
    next_status := 'finished';
    select (value)::integer into top_a from jsonb_each_text(scores) order by value::integer desc limit 1;
    select (value)::integer into top_b from jsonb_each_text(scores) order by value::integer desc offset 1 limit 1;
    if top_a is distinct from top_b then
      select key::uuid into winner from jsonb_each_text(scores) order by value::integer desc limit 1;
    end if;
  end if;

  return row(
    jsonb_build_object('board', board, 'owner', owner, 'up', to_jsonb(up), 'shown', to_jsonb(shown),
      'mismatch', mismatch, 'quiz', quiz, 'qres', qres, 'scores', scores),
    null, next_turn, next_status, winner, room.turn_ready_at
  )::public.game_result;
end;
$$;

revoke all on function public.game_memory_init(jsonb, jsonb),
  public.game_memory_apply(public.game_rooms, jsonb, integer, text, jsonb) from public, anon, authenticated;

-- Register Memory with the dispatchers (one line each).
create or replace function public.game_init(game_type text, options jsonb, players jsonb)
returns public.game_result language plpgsql set search_path = '' as $$
begin
  -- if/elsif (not a CASE expression) so only the chosen game's function has to exist when this runs.
  if game_type = 'tic-tac-toe' then return public.game_tic_tac_toe_init(options, players);
  elsif game_type = 'connect-four' then return public.game_connect_four_init(options, players);
  elsif game_type = 'chutes-and-ladders' then return public.game_chutes_and_ladders_init(options, players);
  elsif game_type = 'candy-land' then return public.game_candy_land_init(options, players);
  elsif game_type = 'memory' then return public.game_memory_init(options, players);
  end if;
  return null;
end;
$$;

create or replace function public.game_apply(room public.game_rooms, private jsonb, seat integer, action text, payload jsonb)
returns public.game_result language plpgsql set search_path = '' as $$
begin
  if room.game_type = 'tic-tac-toe' then return public.game_tic_tac_toe_apply(room, private, seat, action, payload);
  elsif room.game_type = 'connect-four' then return public.game_connect_four_apply(room, private, seat, action, payload);
  elsif room.game_type = 'chutes-and-ladders' then return public.game_chutes_and_ladders_apply(room, private, seat, action, payload);
  elsif room.game_type = 'candy-land' then return public.game_candy_land_apply(room, private, seat, action, payload);
  elsif room.game_type = 'memory' then return public.game_memory_apply(room, private, seat, action, payload);
  end if;
  return null;
end;
$$;
