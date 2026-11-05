"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState} from "react";
import {getSupabase} from "@/lib/supabase";
import {gameOptions, isGameType, normalizeGameRoom, type GameType, type Piece} from "@/lib/games";
import PartyVideo from "./party-video";
import ConnectFour from "./connect-four";
import Memory, {type MemoryOptions, type MemoryState} from "./memory";
import ChanceControls, {candyColors, type ChanceMove} from "./chance-controls";
import styles from "./lobby.module.css";

type Player = {id: string; name: string};
type Room = {
  game_type: GameType; state: Record<string, unknown>; options: Record<string, unknown>;
  board: number[]; winning_cells: number[]; pieces: Piece[];
  id: string; code: string; host_id: string; players: Player[];
  status: "waiting" | "playing" | "finished"; turn_index: number; version: number; winner_id: string | null;
  last_move: ChanceMove | null;
  meet_url?: string | null;
};
const jumps: Record<number, number> = {1:38,4:14,9:31,21:42,28:84,36:44,51:67,71:91,80:100,16:6,47:26,49:11,56:53,62:19,64:60,87:24,93:73,95:75,98:78};
const colors = ["#be123c", "#1d4ed8", "#047857", "#7e22ce", "#a16207", "#0e7490", "#c2410c", "#475569"];
const squares = Array.from({length: 100}, (_, i) => {
  const row = Math.floor(i / 10);
  return (9 - row) * 10 + (row % 2 === 0 ? 10 - i % 10 : i % 10 + 1);
});

export default function Lobby() {
  const [mode, setMode] = useState<"host" | "join">("host");
  const [name, setName] = useState("");
  const [hostPassword, setHostPassword] = useState("");
  const [key, setKey] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [discDropping, setDiscDropping] = useState(false);
  const [connected, setConnected] = useState(false);
  const actionPending = useRef(false);
  const [, setRevealClock] = useState(0);
  const revealActive = Boolean(room?.last_move?.ends_at && Date.parse(room.last_move.ends_at) > Date.now());
  useEffect(() => {
    const until = room?.last_move?.ends_at;
    if (!until) return;
    const remaining = Date.parse(until) - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRevealClock((value) => value + 1), remaining + 30);
    return () => window.clearTimeout(timer);
  }, [room?.last_move?.event_id, room?.last_move?.ends_at]);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (room?.status === "waiting") window.scrollTo({top: 0, behavior: "instant"});
  }, [room?.id, room?.status]);

  useEffect(() => {
    if (room?.status === "finished" && !revealActive && !discDropping) {
      resultRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "nearest",
      });
    }
  }, [room?.id, room?.status, revealActive, discDropping]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    if (requestedMode === "host" || requestedMode === "join") setMode(requestedMode);
    const invite = params.get("key");
    if (invite) {setKey(invite.toUpperCase()); setMode("join");}
    const saved = localStorage.getItem("games-room");
    if (saved && !invite && !requestedMode) setRoomId(saved);
    setName(localStorage.getItem("games-name") ?? "");
    setReady(true);
  }, []);

  const authenticate = async () => {
    const supabase = getSupabase();
    const {data, error: sessionError} = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    let id = data.session?.user.id;
    if (!id) {
      const result = await supabase.auth.signInAnonymously();
      if (result.error) throw result.error;
      id = result.data.user?.id;
    }
    if (!id) throw new Error("Could not start a guest session. Please try again.");
    setUserId(id);
    return supabase;
  };

  const loadRoom = useCallback(async (id: string) => {
    const {data, error: fetchError} = await getSupabase().from("game_rooms").select("*").eq("id", id).single();
    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        if (localStorage.getItem("games-room") === id) localStorage.removeItem("games-room");
        setRoomId((current) => current === id ? null : current);
        setRoom((current) => current?.id === id ? null : current);
        throw new Error("This party is no longer available. Host a new party or join with a different key.");
      }
      throw fetchError;
    }
    const next = normalizeGameRoom(data as Room);
    setRoom((current) => !current || current.id !== next.id || next.version >= current.version ? next : current);
  }, []);

  useEffect(() => {
    if (!roomId || !ready) return;
    let active = true;
    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | undefined;
    setConnected(false);
    const refresh = () => loadRoom(roomId).catch((cause) => {
      if (!active) return;
      setConnected(false);
      // The room row is invisible to someone who was removed from it.
      if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "PGRST116") {
        localStorage.removeItem("games-room"); setRoomId(null); setRoom(null); setError("You are no longer in this room.");
      }
    });
    void (async () => {
      try {
        const supabase = await authenticate();
        if (!active) return;
        await loadRoom(roomId);
        if (!active) return;
        await supabase.rpc("touch_game_room", {room_id: roomId});
        if (!active) return;
        channel = supabase.channel(`game:${roomId}`)
          .on("postgres_changes", {event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}`}, () => {if (active) void refresh();})
          .subscribe((status) => {if (active) {setConnected(status === "SUBSCRIBED"); if (status === "SUBSCRIBED") void refresh();}});
      } catch (cause) {if (active) setError(message(cause));}
    })();
    // Reconcile after reconnects, missed events, and backgrounding a mobile browser.
    const timer = window.setInterval(() => {if (active) void refresh();}, 1000);
    const heartbeat = () => {
      if (active) void getSupabase().rpc("touch_game_room", {room_id: roomId}).then(({error: heartbeatError}) => {
        if (heartbeatError && active) void refresh();
      });
    };
    const heartbeatTimer = window.setInterval(heartbeat, 60_000);
    const onFocus = () => {heartbeat(); void refresh();};
    window.addEventListener("focus", onFocus);
    return () => {active = false; clearInterval(timer); clearInterval(heartbeatTimer); window.removeEventListener("focus", onFocus); if (channel) void getSupabase().removeChannel(channel);};
  }, [roomId, ready, loadRoom]);

  async function enter(event: React.FormEvent) {
    event.preventDefault();
    if (actionPending.current) return;
    actionPending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const supabase = await authenticate();
      let id: string;
      if (mode === "host") {
        const {data: {session}} = await supabase.auth.getSession();
        const response = await fetch("/api/games/host", {
          method: "POST",
          headers: {"Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}`},
          body: JSON.stringify({displayName: name.trim(), password: hostPassword}),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not create the room.");
        id = result.roomId;
        setHostPassword("");
      } else {
        const result = await supabase.rpc("join_game", {room_key: key.trim().toUpperCase(), display_name: name.trim()});
        if (result.error) throw result.error;
        id = result.data;
      }
      localStorage.setItem("games-name", name.trim());
      localStorage.setItem("games-room", id);
      window.history.replaceState(null, "", "/games/lobby");
      setRoomId(id);
      await loadRoom(id);
    } catch (cause) {setError(message(cause));}
    finally {actionPending.current = false; setBusy(false);}
  }

  async function act(action: "start" | "reset" | "kick" | "play" | "spin" | "draw" | "flip" | "answer", payload: Record<string, unknown> = {}) {
    if (!room || actionPending.current) return;
    actionPending.current = true; setBusy(true); setError("");
    try {
      const {error: actionError} = await getSupabase().rpc("game_action", {room_id: room.id, action, expected_version: room.version, payload});
      if (actionError) throw actionError;
      await loadRoom(room.id);
    } catch (cause) {setError(message(cause)); await loadRoom(room.id).catch(() => {});}
    finally {actionPending.current = false; setBusy(false);}
  }

  // Choosing a different game uses that game's default options; passing options re-applies the current game with changes.
  async function changeGame(nextGame: string, gameOptions?: Record<string, unknown>) {
    if (!room || actionPending.current || !isGameType(nextGame) || (nextGame === room.game_type && !gameOptions)) return;
    actionPending.current = true; setBusy(true); setError("");
    try {
      const options = gameOptions ? {...(nextGame === room.game_type ? room.options : {}), ...gameOptions} : {};
      const {error: changeError} = await getSupabase().rpc("change_party_game", {room_id: room.id, selected_game: nextGame, expected_version: room.version, game_options: options});
      if (changeError) throw changeError;
      await loadRoom(room.id);
    } catch (cause) {setError(message(cause)); await loadRoom(room.id).catch(() => {});}
    finally {actionPending.current = false; setBusy(false);}
  }

  async function deleteOtherParties() {
    if (!room || room.host_id !== userId || actionPending.current) return;
    if (!window.confirm("Permanently delete ALL other parties and their game data, including any active parties? Your current party will be kept. This cannot be undone.")) return;
    actionPending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const {data, error: deleteError} = await getSupabase().rpc("delete_other_parties", {current_room_id: room.id});
      if (deleteError) throw deleteError;
      setNotice(`Deleted ${data} other ${data === 1 ? "party" : "parties"}. Your current party was kept.`);
    } catch (cause) {setError(message(cause));}
    finally {actionPending.current = false; setBusy(false);}
  }

  async function copy(value: string) {
    try {await navigator.clipboard.writeText(value); setNotice("Copied!");}
    catch {setNotice("Could not copy automatically. Select and copy the room key shown above.");}
  }
  function exit() {
    // Keep the seat reserved so this browser can rejoin with the same key.
    localStorage.removeItem("games-room");
    window.history.replaceState(null, "", "/games/lobby");
    setRoomId(null); setRoom(null); setError(""); setNotice("");
  }
  const host = room?.host_id === userId;
  const turn = room?.players[room.turn_index];
  const winner = room?.players.find((player) => player.id === room.winner_id);

  const currentGame = gameOptions[room?.game_type ?? "chutes-and-ladders"];
  const gridGame = room?.game_type === "tic-tac-toe" || room?.game_type === "connect-four";
  const candyGame = room?.game_type === "candy-land";
  const memoryGame = room?.game_type === "memory";
  const chanceGame = !gridGame && !memoryGame;
  const memoryScore = (player: Player) => (room?.state.scores as Record<string, number> | undefined)?.[player.id] ?? 0;
  const pieceSpace = (player: Player) => room?.pieces.find((piece) => piece.owner === player.id)?.space ?? 0;
  const visiblePosition = (player: Player) => revealActive && room?.last_move?.player_id === player.id ? room.last_move.from_space ?? pieceSpace(player) : pieceSpace(player);
  const canMove = !busy && !revealActive && !discDropping && room?.status === "playing" && turn?.id === userId;

  return <main className={styles.page}>
    <div className={styles.wrap}>
      <Link href="/games" className={styles.back}>← All games</Link>
      <header className={`${styles.header} ${room ? styles.compactHeader : ""}`}>
        <p className={styles.eyebrow}>Play together</p>
        <h1>{room ? room.status === "waiting" ? "Your party lobby" : currentGame.name : mode === "host" ? "Start your party." : "Join your friends."}</h1>
        <p>{room ? room.status === "waiting" ? "Get together, pick a game, and let the fun begin." : `${currentGame.name} · ${currentGame.maxPlayers === 2 ? "2" : "2–8"} players` : "Meet in the lobby first. Choose a game together when you’re ready."}</p>
      </header>
      {error && <div role="alert" className={styles.error}>{error}</div>}
      {!room && !roomId && <section className={styles.entry} aria-label="Host or join a game">
        <div className={styles.choices}>
          <button type="button" aria-pressed={mode === "host"} onClick={() => setMode("host")}>Host a game<span>Create a room and get a key</span></button>
          <button type="button" aria-pressed={mode === "join"} onClick={() => setMode("join")}>Join a game<span>Enter a key from your host</span></button>
        </div>
        <form onSubmit={enter} className={styles.form}>
          <h2>{mode === "host" ? "Make room for some fun." : "Meet you at the board."}</h2>
          <label>Your display name<input autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required placeholder="What should we call you?" /></label>
          {mode === "join" && <label>Room key<input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} maxLength={8} minLength={8} pattern="[A-Fa-f0-9]{8}" autoCapitalize="characters" spellCheck={false} required placeholder="E.g. A12B34C5" /></label>}
          {mode === "host" && <label>Host password<input type="password" autoComplete="current-password" value={hostPassword} onChange={(e) => setHostPassword(e.target.value)} maxLength={1024} required placeholder="Enter the host password" /></label>}
          {mode === "host" && <p>Create a party lobby, invite your friends, and choose a game once you’re together.</p>}
          <button className={styles.primary} disabled={busy || !ready}>{busy ? "Connecting…" : mode === "host" ? "Create room & get key" : "Join room"}</button>
          <p className={styles.small}>No account needed. Your seat is remembered in this browser.</p>
        </form>
      </section>}
      {!room && roomId && <section className={styles.panel}><p>Reconnecting to your room…</p><button onClick={exit}>Back to host or join</button></section>}
      {room && <>
        <section className={styles.roomBar} aria-label="Room details and players">
          <div className={styles.roomInvite}>
            <div><span className={styles.eyebrow}>Room key</span><p className={styles.code}>{room.code}</p></div>
            <div className={styles.inviteActions}>
              <button onClick={() => void copy(room.code)}>Copy key</button>
              <button onClick={() => void copy(`${window.location.origin}/games/lobby?key=${room.code}`)}>Copy invite link</button>
            </div>
            <span className={styles.small} role="status">{connected ? "Live updates connected" : "Checking for updates every second"}</span>
            <span className={styles.copyNote} role="status" aria-live="polite">{notice}</span>
          </div>
          <div className={styles.tableSummary}>
            <h2>At the table <span className={styles.small}>{room.players.length}/{room.status === "waiting" ? 8 : currentGame.maxPlayers}</span></h2>
            <ol className={styles.players}>{room.players.map((player, i) => <li key={player.id}>
              <span className={styles.token} style={{background: gridGame && i === 1 ? "#a16207" : colors[i]}}>{room.game_type === "tic-tac-toe" ? (i === 0 ? "X" : "O") : i + 1}</span>
              <div><strong>{player.name}{player.id === userId ? " (you)" : ""}</strong><span>{player.id === room.host_id ? "Host · " : ""}{room.status === "waiting" ? "Ready to play" : gridGame ? (room.game_type === "tic-tac-toe" ? (i === 0 ? "Playing X" : "Playing O") : (i === 0 ? "Red discs" : "Yellow discs")) : memoryGame ? `${memoryScore(player)} point${memoryScore(player) === 1 ? "" : "s"}` : `Square ${visiblePosition(player)}`}</span></div>
              {room.status === "playing" && turn?.id === player.id && <span aria-label="Current turn">←</span>}
              {host && room.status === "waiting" && player.id !== userId && <button type="button" disabled={busy} onClick={() => {if (window.confirm(`Remove ${player.name} from the party?`)) void act("kick", {player_id: player.id});}}>Remove</button>}
            </li>)}</ol>
          </div>
          <div className={styles.roomControls}>
            <PartyVideo roomId={room.id} version={room.version} meetUrl={room.meet_url} host={host} onUpdated={() => loadRoom(room.id)} />
            {room.status === "waiting" ? <>
              <h2>You’re in the lobby</h2>
              <p>{host ? "Share your key, then choose a game below." : "Hang out here while the host chooses a game."}</p>
            </> : <>
              <h2 aria-live="polite">{revealActive ? `${room.last_move?.player} is ${candyGame ? "drawing…" : "spinning…"}` : winner ? `${winner.name} wins!` : room.status === "finished" ? "It’s a draw!" : turn?.id === userId ? "Your turn!" : `${turn?.name}’s turn`}</h2>
              <p aria-live="polite">{revealActive ? "Let’s see where you’ll go!" : memoryGame ? (room.status === "finished" ? "Every pair has been taken." : canMove ? "Flip two cards and look for a match." : `Waiting for ${turn?.name} to flip.`) : candyGame ? (room.last_move ? `${room.last_move.player} moved to ${room.last_move.destination === 61 ? "the candy castle" : `square ${room.last_move.destination}`}.` : "Draw a card and follow the rainbow!") : gridGame
                ? (room.last_move?.slot !== undefined ? `${room.last_move.player} ${room.game_type === "connect-four" ? `dropped a disc in column ${room.last_move.slot % 7 + 1}` : `played square ${room.last_move.slot + 1}`}.` : "The board is ready. The host goes first.")
                : room.last_move ? `${room.last_move.player} spun ${room.last_move.roll}. ${(room.last_move.destination ?? 0) > (room.last_move.landing ?? 0) ? "Up the ladder! " : (room.last_move.destination ?? 0) < (room.last_move.landing ?? 0) ? "Down the chute! " : ""}Now on square ${room.last_move.destination}.` : "The board is ready. Let’s roll!"}</p>
              {host && <button disabled={busy || revealActive} onClick={() => {if (room.status === "finished" || window.confirm("End this game and return everyone to the lobby?")) void act("reset");}}>Return everyone to lobby</button>}
            </>}
            {host && <details className={styles.hostTools}>
              <summary>Host tools</summary>
              <p>Delete all other parties, including active ones. This party and its players stay connected.</p>
              <button type="button" className={styles.dangerButton} disabled={busy} onClick={() => void deleteOtherParties()}>Delete all other parties</button>
            </details>}
            <div className={styles.roomUtilities}>
              <details className={styles.rules}><summary>How to play</summary><p>{currentGame.rules}</p></details>
              <button onClick={exit} className={styles.exit} title="Your seat stays reserved. Use the same key in this browser to return.">Back to host or join</button>
            </div>
          </div>
        </section>
        {room.status === "waiting" ? <section className={styles.partyLobby} aria-label="Party lobby">
          <div className={styles.lobbyHeading}>
            <div><p className={styles.eyebrow}>What shall we play?</p><h2>Choose your next adventure.</h2></div>
            <p>{host ? "Pick a game for your party. Everyone will move to the board when you start." : "The host picks the game. You’ll head to the board together."}</p>
          </div>
          <div className={styles.partyGames}>{Object.entries(gameOptions).map(([id, game]) => {
            const full = room.players.length > game.maxPlayers;
            const icons: Record<string, string> = {"candy-land": "🍭", "chutes-and-ladders": "🪜", "tic-tac-toe": "✕ ○", "connect-four": "🔴 🟡", "memory": "🃏"};
            return <button key={id} type="button" disabled={busy || !host || full} aria-pressed={room.game_type === id} onClick={() => void changeGame(id)} className={`${styles.partyGameCard} ${full ? styles.unavailableGame : ""}`}>
              <span aria-hidden="true" className={styles.gameIcon}>{icons[id]}</span>
              <strong>{game.name}</strong><span>{game.maxPlayers === 2 ? "2 players" : "2–8 players"}</span>
              <small>{full ? "Party too large · 2 players only" : room.game_type === id ? "Selected for your party ✓" : host ? "Choose this game" : "Host chooses the game"}</small>
            </button>;
          })}</div>
          {memoryGame && <div className={styles.memoryOptions}>
            <h3>Memory settings</h3>
            {host ? <>
              <label>Board size<select value={Number(room.options.size ?? 6)} disabled={busy} onChange={(event) => void changeGame("memory", {size: Number(event.target.value)})}>
                {[4, 6, 8, 10].map((n) => <option key={n} value={n}>{n} × {n} ({n * n / 2} pairs)</option>)}
              </select></label>
              <label><input type="checkbox" checked={room.options.showNames !== false} disabled={busy} onChange={(event) => void changeGame("memory", {showNames: event.target.checked})} /> Show flag names</label>
              <p className={styles.small}>Turn names off for hard mode: each match asks you to pick the right name for a bonus point.</p>
            </> : <p>{String(room.options.size ?? 6)} × {String(room.options.size ?? 6)} board · {room.options.showNames === false ? "hard mode (names hidden)" : "names shown"}</p>}
          </div>}
          <div className={styles.lobbyStart}>
            <div><strong>{currentGame.name}</strong><p>{room.players.length < 2 ? "Share your key to invite another player." : room.players.length > currentGame.maxPlayers ? "Choose a game that fits everyone in your party." : `${room.players.length} players ready to play.`}</p></div>
            {host ? <button type="button" className={styles.primary} disabled={busy || room.players.length < 2 || room.players.length > currentGame.maxPlayers} onClick={() => void act("start")}>Start {currentGame.name} →</button> : <p role="status">Waiting for the host to start…</p>}
          </div>
        </section> : <div className={styles.gameLayout}>
          <section className={`${styles.boardPanel} ${chanceGame ? styles.raceLayout : styles.strategyLayout}`} aria-label={`${currentGame.name} board`}>
            {room.status === "finished" && !revealActive && !discDropping && <div ref={resultRef} key={`${room.id}-${room.version}`} className={`${styles.resultBanner} ${winner ? styles.resultWin : styles.resultTie}`} role="status" aria-live="polite" aria-atomic="true">
              {winner && <div className={styles.confetti} aria-hidden="true">{Array.from({length: 16}, (_, index) => <span key={index} style={{left: `${4 + index * 6}%`, background: colors[index % colors.length], animationDelay: `${(index % 5) * 90}ms`}} />)}</div>}
              <span className={styles.resultIcon} aria-hidden="true">{winner ? "🏆" : "🤝"}</span>
              <p className={styles.eyebrow}>Game over</p>
              <h3>{winner ? `${winner.name} Wins!` : "Tie Game"}</h3>
              <p>{winner ? "That’s a winning move. Well played!" : "An evenly matched showdown. Time for a rematch?"}</p>
              {host ? <button type="button" className={styles.primary} disabled={busy} onClick={() => void act("reset")}>Back to lobby for a rematch</button> : <p className={styles.small}>Waiting for the host to set up the next round.</p>}
            </div>}

            {chanceGame && <ChanceControls candy={candyGame} move={room.last_move} active={revealActive} canMove={canMove} busy={busy} onAction={() => void act(candyGame ? "draw" : "spin")} />}
            {memoryGame ? <div className={styles.strategyPanel}>
              <h2>Memory</h2>
              <Memory state={room.state as unknown as MemoryState} options={room.options as MemoryOptions} players={room.players} userId={userId}
                canMove={canMove} busy={busy} onFlip={(index) => void act("flip", {i: index})} onAnswer={(pick) => void act("answer", {pick})} />
              <p className={styles.legend}>{room.status === "finished" ? "Game over. The host can return everyone to the lobby for a rematch." : "Match a pair to keep your turn. A miss passes it."}</p>
            </div> : candyGame ? <div className={styles.candyBoardPanel}>
              <h2>Follow the rainbow</h2>
              <div className={styles.candyCastle}><span aria-hidden="true">🏰 🍬</span><strong>Candy Castle · Finish!</strong><span className={styles.finishPieces}>{room.players.map((player, i) => visiblePosition(player) === 61 ? <span key={player.id} className={styles.token} style={{background: colors[i]}} title={player.name}>{i + 1}</span> : null)}</span></div>
              <div className={styles.candyPath}>{Array.from({length: 60}, (_, index) => {
                const row = Math.floor(index / 10);
                const square = (5 - row) * 10 + (row % 2 === 0 ? 10 - index % 10 : index % 10 + 1);
                const color = candyColors[(square - 1) % 6];
                return <div key={square} className={styles.candySpace} style={{background: color.hex}} aria-label={`Space ${square}, ${color.name}`}>
                  <span className={styles.candyNumber}>{square}</span><span className={styles.candySymbol} aria-hidden="true">{color.symbol}</span>
                  <span className={styles.pieces}>{room.players.map((player, i) => visiblePosition(player) === square ? <span key={player.id} className={styles.piece} style={{background: colors[i]}} title={player.name}>{i + 1}</span> : null)}</span>
                </div>;
              })}</div>
              <div className={styles.candyStart}><strong>Start →</strong>{room.players.map((player, i) => visiblePosition(player) === 0 ? <span key={player.id} className={styles.token} style={{background: colors[i]}} title={player.name}>{i + 1}</span> : null)}</div>
              <p className={styles.legend}>Start at 1 at the bottom-left. Follow each row back and forth to the castle. Match the color and symbol on your card.</p>
            </div> : gridGame ? <div className={styles.strategyPanel}>
              <h2>{currentGame.name}</h2>
              {room.game_type === "tic-tac-toe" ? <div className={styles.ticBoard}>
                {room.board.map((mark, index) => <button type="button" key={index} className={`${styles.ticCell} ${room.winning_cells.includes(index) ? styles.winning : ""}`} disabled={!canMove || mark !== 0} aria-label={`Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: ${mark ? mark === 1 ? "X" : "O" : "empty"}`} onClick={() => void act("play", {move: index})}>{mark ? mark === 1 ? "X" : "O" : ""}</button>)}
              </div> : <ConnectFour key={room.id} roomId={room.id} version={room.version} board={room.board} winningCells={room.winning_cells} lastSlot={room.last_move?.slot} canMove={canMove} playerMark={room.players.findIndex((player) => player.id === userId) + 1} onMove={(column) => void act("play", {move: column})} onDroppingChange={setDiscDropping} />}
              <p className={styles.legend}>{room.status === "finished" ? "Game over. The host can return everyone to the lobby for a rematch." : canMove ? room.game_type === "tic-tac-toe" ? "Choose an empty square." : "Choose a column to drop your disc." : `Waiting for ${turn?.name} to move.`}</p>
            </div> : <div className={styles.trackBoard}>
            <div className={styles.board}>{squares.map((square) => <div key={square} className={`${styles.square} ${jumps[square] ? jumps[square] > square ? styles.ladder : styles.chute : ""}`}>
              <span className={styles.number}>{square}</span>
              {jumps[square] && <span className={styles.jump} aria-label={`${jumps[square] > square ? "Ladder" : "Chute"} to ${jumps[square]}`}>{jumps[square] > square ? "↑" : "↓"}{jumps[square]}</span>}
              <span className={styles.pieces}>{room.players.map((player, i) => visiblePosition(player) === square ? <span key={player.id} className={styles.piece} style={{background: colors[i]}} title={`${player.name}, square ${square}`}>{i + 1}</span> : null)}</span>
            </div>)}</div>
            <p className={styles.legend}>Green ↑ climb a ladder · Rose ↓ slide down a chute · Players start off the board at 0</p>
            </div>}
          </section>
        </div>}
      </>}
    </div>
  </main>;
}

function message(cause: unknown) {
  const text = typeof cause === "object" && cause !== null && "message" in cause ? String(cause.message) : "Something went wrong. Please try again.";
  if (text.includes("schema cache") || text.includes("does not exist")) return "The multiplayer database is not ready yet. Its migration needs to be deployed.";
  if (text.toLowerCase().includes("anonymous sign-ins are disabled")) return "Guest sign-in is not enabled yet. Enable Anonymous Sign-Ins in Supabase Authentication.";
  return text;
}
