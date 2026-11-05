"use client";

import {useEffect, useMemo, useState} from "react";
import {getSupabase} from "@/lib/supabase";
import styles from "./lobby.module.css";

type Card = {id: string; name: string};
export type MemoryState = {
  board: (string | null)[]; owner: (string | null)[]; up: number[]; shown: number[]; mismatch: boolean;
  quiz: {player_id: string; card: string; options: string[]} | null;
  qres: {player_id: string; correct: boolean; card: string} | null;
  scores: Record<string, number>;
};
export type MemoryOptions = {genre?: string; showNames?: boolean; size?: number};

export default function Memory({state, options, players, userId, canMove, busy, onFlip, onAnswer}: {
  state: MemoryState; options: MemoryOptions; players: {id: string; name: string}[]; userId: string;
  canMove: boolean; busy: boolean; onFlip: (index: number) => void; onAnswer: (pick: string) => void;
}) {
  const genre = options.genre ?? "flags";
  const size = options.size ?? Math.round(Math.sqrt(state.board.length));
  const showNames = options.showNames !== false;
  const [cards, setCards] = useState<Card[]>([]);
  useEffect(() => {
    let active = true;
    void (async () => {
      const {data} = await getSupabase().from("memory_sets").select("cards").eq("id", genre).single();
      if (!active || !data) return;
      const list = data.cards as Card[];
      setCards(list);
      // Load every picture once so a flipped card shows immediately.
      for (const card of list) new Image().src = imageUrl(genre, card.id);
    })();
    return () => {active = false;};
  }, [genre]);
  const names = useMemo(() => new Map(cards.map((card) => [card.id, card.name])), [cards]);
  const nameOf = (id: string) => names.get(id) ?? id;
  const playerName = (id: string) => players.find((player) => player.id === id)?.name ?? "A player";

  const quiz = state.quiz;
  const result = state.qres;
  const canFlip = canMove && !busy && !quiz;
  return <div className={styles.memoryGame}>
    {quiz && <div className={styles.memoryQuiz} role="group" aria-label="Bonus question">
      {quiz.player_id === userId ? <>
        <h3>Bonus point: whose flag did you just match?</h3>
        <div className={styles.memoryAnswers}>
          {quiz.options.map((option) => <button type="button" key={option} disabled={busy} onClick={() => onAnswer(option)}>{nameOf(option)}</button>)}
        </div>
      </> : <p>{playerName(quiz.player_id)} is answering a bonus question…</p>}
    </div>}
    {!quiz && result && <p className={styles.memoryResult} role="status">
      {playerName(result.player_id)}: {result.correct ? "Correct! Bonus point." : `Not quite, it was ${nameOf(result.card)}.`}
    </p>}
    <div className={styles.memoryBoard} style={{gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`}}>
      {state.board.map((id, index) => {
        if (id === null && state.owner[index] !== null) return <span key={index} className={styles.memoryGone} aria-hidden="true" />;
        if (id === null) {
          return <button type="button" key={index} className={`${styles.memoryCard} ${styles.memoryDown}`} disabled={!canFlip}
            aria-label={`Card ${index + 1}, face down`} onClick={() => onFlip(index)}>?</button>;
        }
        const matched = state.shown.includes(index);
        const missed = state.mismatch && state.up.includes(index);
        return <button type="button" key={index} disabled className={`${styles.memoryCard} ${styles.memoryUp} ${matched ? styles.memoryMatched : ""} ${missed ? styles.memoryMiss : ""}`}
          aria-label={`Card ${index + 1}, ${showNames ? nameOf(id) : "a flag"}${matched ? ", matched" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(genre, id)} alt="" draggable={false} />
          {showNames && <span className={styles.memoryName}>{nameOf(id)}</span>}
        </button>;
      })}
    </div>
  </div>;
}

function imageUrl(genre: string, id: string) {
  return `/memory/${genre}/${id}.png`;
}
