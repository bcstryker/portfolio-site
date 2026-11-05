"use client";

import {useMemo, type CSSProperties} from "react";
import styles from "./lobby.module.css";

export type ChanceMove = {
  player: string; player_id?: string; roll?: number; landing?: number; destination?: number; slot?: number;
  event_id?: string; started_at?: string; ends_at?: string; from_position?: number;
  color?: number; matches?: number; remaining?: number;
};
export const candyColors = [
  {name: "Red", hex: "#fb7185", symbol: "♥"},
  {name: "Purple", hex: "#c084fc", symbol: "★"},
  {name: "Yellow", hex: "#fde047", symbol: "☀"},
  {name: "Blue", hex: "#7dd3fc", symbol: "◆"},
  {name: "Orange", hex: "#fdba74", symbol: "●"},
  {name: "Green", hex: "#86efac", symbol: "♣"},
];

export default function ChanceControls({candy, move, active, canMove, busy, onAction}: {
  candy: boolean; move: ChanceMove | null; active: boolean; canMove: boolean; busy: boolean; onAction: () => void;
}) {
  // Preserve animation timing across polling/realtime rerenders of the same move.
  const delay = useMemo(() => move?.started_at ? Date.parse(move.started_at) - Date.now() : 0, [move?.event_id, move?.started_at]);
  const color = candyColors[move?.color ?? 0];
  const timing = {"--reveal-delay": `${delay}ms`, "--spin-end": `${((move?.roll ?? 1) - 1) * 60 + 30}deg`} as CSSProperties;
  return <section className={styles.chanceArea} aria-label={candy ? "Shared card deck" : "Shared spinner"}>
    <div className={styles.chanceIntro}>
      <p className={styles.eyebrow}>{candy ? "A little rainbow magic" : "Give it a whirl"}</p>
      <h2>{candy ? "Pick a card!" : "Spin the wheel!"}</h2>
      <p>{active ? `${move?.player} is ${candy ? "drawing a card" : "spinning"}…` : canMove ? candy ? "Tap the deck to reveal your next adventure." : "Tap the wheel and see where you’ll land." : candy ? "Watch for your turn!" : ""}</p>
    </div>
    {candy ? <div className={styles.cardTable}>
      <button type="button" className={styles.deck} disabled={!canMove || active || busy} onClick={onAction} aria-label="Draw the top Candy Land card">
        <span className={styles.deckBack}><span aria-hidden="true">🍭</span><strong>Candy<br />Land</strong><small>{busy ? "Drawing…" : "Tap to draw"}</small></span>
      </button>
      <div className={styles.cardLanding}>
        {move?.color !== undefined ? <div key={move.event_id} className={`${styles.flippedCard} ${active ? styles.cardAnimating : ""}`} style={timing}>
          <div className={styles.cardBack} aria-hidden="true">🍭</div>
          <div className={styles.cardFront} style={{background: color.hex}} aria-label={`${move.matches === 2 ? "Double" : "Single"} ${color.name} card`}>
            <span>{color.name}</span><div>{Array.from({length: move.matches ?? 1}, (_, i) => <b key={i} aria-hidden="true">{color.symbol}</b>)}</div><strong>{move.matches === 2 ? "Double" : "Single"}</strong>
          </div>
        </div> : <div className={styles.emptyCard}>Your next<br />color awaits ✨</div>}
      </div>
    </div> : <button type="button" className={styles.spinnerButton} disabled={!canMove || active || busy} onClick={onAction} aria-label="Spin the wheel">
      <span className={styles.spinnerWheel}>
        {[1,2,3,4,5,6].map((number, index) => {
          const angle = (index * 60 + 30) * Math.PI / 180;
          return <span key={number} className={styles.spinnerNumber} style={{left: `${50 + Math.sin(angle) * 36}%`, top: `${50 - Math.cos(angle) * 36}%`}}>{number}</span>;
        })}
        <span key={move?.event_id ?? "idle"} className={`${styles.spinnerNeedle} ${active ? styles.needleAnimating : ""}`} style={timing} aria-hidden="true" />
        <span className={styles.spinnerHub} aria-hidden="true" />
      </span>
      <span className={styles.spinLabel}>{busy ? "Starting…" : active ? "Wheee!" : canMove ? "Tap to spin" : "Watch the wheel"}</span>
    </button>}
    <p className={styles.chanceResult} role="status" aria-live="polite">{active ? "Watch it go…" : move ? candy ? `${move.player} drew ${move.matches === 2 ? "double" : "single"} ${color.name.toLowerCase()}!` : `${move.player} spun ${move.roll}!` : candy ? "48 colorful cards. What will you draw?" : "Round and round… what will it be?"}</p>
    {candy && <p className={styles.small}>{active ? "Flipping the top card…" : `${move?.remaining ?? 48} cards left · Reshuffles when empty`}</p>}
  </section>;
}
