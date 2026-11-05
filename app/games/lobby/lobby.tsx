"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState} from "react";
import {getSupabase} from "@/lib/supabase";
import styles from "./lobby.module.css";

type Player = {id: string; name: string; position: number};
type Room = {
  id: string; code: string; host_id: string; players: Player[];
  status: "waiting" | "playing" | "finished"; turn_index: number; version: number; winner_id: string | null;
  last_move: {player: string; roll: number; landing: number; destination: number} | null;
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
  const [key, setKey] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connected, setConnected] = useState(false);
  const actionPending = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("key");
    if (invite) {setKey(invite.toUpperCase()); setMode("join");}
    const saved = localStorage.getItem("games-room");
    if (saved && !invite) setRoomId(saved);
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
    if (fetchError) throw fetchError;
    const next = data as Room;
    setRoom((current) => !current || current.id !== next.id || next.version >= current.version ? next : current);
  }, []);

  useEffect(() => {
    if (!roomId || !ready) return;
    let active = true;
    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | undefined;
    setConnected(false);
    const refresh = () => loadRoom(roomId).catch(() => {if (active) setConnected(false);});
    void (async () => {
      try {
        const supabase = await authenticate();
        if (!active) return;
        await loadRoom(roomId);
        if (!active) return;
        channel = supabase.channel(`game:${roomId}`)
          .on("postgres_changes", {event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}`}, () => {if (active) void refresh();})
          .subscribe((status) => {if (active) {setConnected(status === "SUBSCRIBED"); if (status === "SUBSCRIBED") void refresh();}});
      } catch (cause) {if (active) setError(message(cause));}
    })();
    // Reconcile after reconnects, missed events, and backgrounding a mobile browser.
    const timer = window.setInterval(() => {if (active) void refresh();}, 5000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {active = false; clearInterval(timer); window.removeEventListener("focus", onFocus); if (channel) void getSupabase().removeChannel(channel);};
  }, [roomId, ready, loadRoom]);

  async function enter(event: React.FormEvent) {
    event.preventDefault();
    if (actionPending.current) return;
    actionPending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const supabase = await authenticate();
      const result = mode === "host"
        ? await supabase.rpc("host_game", {display_name: name.trim()})
        : await supabase.rpc("join_game", {room_key: key.trim().toUpperCase(), display_name: name.trim()});
      if (result.error) throw result.error;
      localStorage.setItem("games-name", name.trim());
      localStorage.setItem("games-room", result.data);
      setRoomId(result.data);
      await loadRoom(result.data);
    } catch (cause) {setError(message(cause));}
    finally {actionPending.current = false; setBusy(false);}
  }

  async function act(action: "start" | "roll" | "reset") {
    if (!room || actionPending.current) return;
    actionPending.current = true; setBusy(true); setError("");
    try {
      const {error: actionError} = await getSupabase().rpc("game_action", {room_id: room.id, action, expected_version: room.version});
      if (actionError) throw actionError;
      await loadRoom(room.id);
    } catch (cause) {setError(message(cause)); await loadRoom(room.id).catch(() => {});}
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

  return <main className={styles.page}>
    <div className={styles.wrap}>
      <Link href="/games" className={styles.back}>← All games</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Play together</p>
        <h1>{room ? "Your game room" : "A little friendly competition."}</h1>
        <p>{room ? "Chutes and Ladders · 2–8 players" : "Host a game, share your key, and gather everyone around the board."}</p>
      </header>
      {error && <div role="alert" className={styles.error}>{error}</div>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {!room && !roomId && <section className={styles.entry} aria-label="Host or join a game">
        <div className={styles.choices}>
          <button type="button" aria-pressed={mode === "host"} onClick={() => setMode("host")}>Host a game<span>Create a room and get a key</span></button>
          <button type="button" aria-pressed={mode === "join"} onClick={() => setMode("join")}>Join a game<span>Enter a key from your host</span></button>
        </div>
        <form onSubmit={enter} className={styles.form}>
          <h2>{mode === "host" ? "Make room for some fun." : "Meet you at the board."}</h2>
          <label>Your display name<input autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required placeholder="What should we call you?" /></label>
          {mode === "join" && <label>Room key<input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} maxLength={8} minLength={8} pattern="[A-Fa-f0-9]{8}" autoCapitalize="characters" spellCheck={false} required placeholder="E.g. A12B34C5" /></label>}
          {mode === "host" && <p>Start with Chutes and Ladders. Your guests can join before you start the game.</p>}
          <button className={styles.primary} disabled={busy || !ready}>{busy ? "Connecting…" : mode === "host" ? "Create room & get key" : "Join room"}</button>
          <p className={styles.small}>No account needed. Your seat is remembered in this browser.</p>
        </form>
      </section>}
      {!room && roomId && <section className={styles.panel}><p>Reconnecting to your room…</p><button onClick={exit}>Back to host or join</button></section>}
      {room && <>
        <section className={styles.roomBar}>
          <div><span className={styles.eyebrow}>Room key</span><p className={styles.code}>{room.code}</p></div>
          <button onClick={() => void copy(room.code)}>Copy key</button>
          <button onClick={() => void copy(`${window.location.origin}/games/lobby?key=${room.code}`)}>Copy invite link</button>
          <span className={styles.small} role="status">{connected ? "Live updates connected" : "Checking for updates every 5 seconds"}</span>
        </section>
        <div className={styles.gameLayout}>
          <aside className={styles.panel}>
            <h2>At the table <span className={styles.small}>{room.players.length}/8</span></h2>
            <ol className={styles.players}>{room.players.map((player, i) => <li key={player.id}>
              <span className={styles.token} style={{background: colors[i]}}>{i + 1}</span>
              <div><strong>{player.name}{player.id === userId ? " (you)" : ""}</strong><span>{player.id === room.host_id ? "Host · " : ""}{room.status === "waiting" ? "Ready to play" : `Square ${player.position}`}</span></div>
              {room.status === "playing" && turn?.id === player.id && <span aria-label="Current turn">←</span>}
            </li>)}</ol>
            {room.status === "waiting" ? <>
              <p>Share the room key with your friends. Everyone joins from their own browser.</p>
              {host ? <button className={styles.primary} disabled={busy || room.players.length < 2} onClick={() => void act("start")}>{room.players.length < 2 ? "Waiting for another player…" : "Start game"}</button> : <p>Waiting for the host to start.</p>}
            </> : <>
              <h2 aria-live="polite">{winner ? `${winner.name} wins!` : turn?.id === userId ? "Your turn!" : `${turn?.name}’s turn`}</h2>
              <button className={styles.primary} disabled={busy || room.status !== "playing" || turn?.id !== userId} onClick={() => void act("roll")}>{busy ? "Rolling…" : "Roll the die"}</button>
              <p aria-live="polite">{room.last_move ? `${room.last_move.player} rolled ${room.last_move.roll}. ${room.last_move.destination > room.last_move.landing ? "Up the ladder! " : room.last_move.destination < room.last_move.landing ? "Down the chute! " : ""}Now on square ${room.last_move.destination}.` : "The board is ready. Let’s roll!"}</p>
              {host && <button disabled={busy} onClick={() => {if (room.status === "finished" || window.confirm("End this game and return everyone to the lobby?")) void act("reset");}}>Return everyone to lobby</button>}
            </>}
            <details className={styles.rules}><summary>How to play</summary><p>Take turns rolling a six-sided die. Land at a ladder’s foot to climb, or a chute’s top to slide. Reach 100 with an exact roll to win; if you overshoot, stay put. Board arrows show where each chute or ladder leads.</p></details>
            <button onClick={exit} className={styles.exit}>Back to host or join</button>
            <p className={styles.small}>Your seat stays reserved. Use the same key in this browser to return.</p>
          </aside>
          <section className={styles.boardPanel} aria-label="Chutes and Ladders board">
            <div className={styles.board}>{squares.map((square) => <div key={square} className={`${styles.square} ${jumps[square] ? jumps[square] > square ? styles.ladder : styles.chute : ""}`}>
              <span className={styles.number}>{square}</span>
              {jumps[square] && <span className={styles.jump} aria-label={`${jumps[square] > square ? "Ladder" : "Chute"} to ${jumps[square]}`}>{jumps[square] > square ? "↑" : "↓"}{jumps[square]}</span>}
              <span className={styles.pieces}>{room.players.map((player, i) => player.position === square ? <span key={player.id} className={styles.piece} style={{background: colors[i]}} title={`${player.name}, square ${square}`}>{i + 1}</span> : null)}</span>
            </div>)}</div>
            <p className={styles.legend}>Green ↑ climb a ladder · Rose ↓ slide down a chute · Players start off the board at 0</p>
          </section>
        </div>
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
