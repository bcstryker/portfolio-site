"use client";

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from "react";
import {keyboardColumn} from "@/lib/connect-four-input";
import styles from "./lobby.module.css";

type Props = {
  roomId: string; version: number; board: number[]; winningCells: number[];
  lastSlot?: number; canMove: boolean; playerMark: number;
  onMove: (column: number) => void; onDroppingChange: (dropping: boolean) => void;
};
export default function ConnectFour({roomId, version, board, winningCells, lastSlot, canMove, playerMark, onMove, onDroppingChange}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [fall, setFall] = useState<{slot: number; key: string} | null>(null);
  const previous = useRef({roomId, version, board});
  const onDropping = useRef(onDroppingChange);
  onDropping.current = onDroppingChange;
  const choose = useRef(onMove);
  choose.current = onMove;

  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = {roomId, version, board};
    if (old.roomId !== roomId) {setFall(null); onDropping.current(false); return;}
    if (version <= old.version || lastSlot === undefined || board[lastSlot] === 0 || old.board[lastSlot] !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setFall({slot: lastSlot, key: `${roomId}-${version}`});
    onDropping.current(true);
  }, [roomId, version, board, lastSlot]);

  useEffect(() => {
    if (!fall) return;
    const timer = window.setTimeout(() => {setFall(null); onDropping.current(false);}, 650);
    return () => window.clearTimeout(timer);
  }, [fall]);
  useEffect(() => () => onDropping.current(false), []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      const editing = target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'));
      const column = keyboardColumn(event, editing);
      if (column === null || !canMove || fall || board[column] !== 0) return;
      event.preventDefault();
      choose.current(column);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [canMove, fall, board]);

  const preview = hovered ?? focused;
  return <div className={styles.connectGame} onMouseLeave={() => setHovered(null)}>
    <p className={styles.keyboardHint}>Click a column or press <kbd>1</kbd>–<kbd>7</kbd> to drop your disc.</p>
    <div className={styles.connectDropRow}>
      {Array.from({length: 7}, (_, column) => {
        const enabled = canMove && !fall && board[column] === 0;
        return <button type="button" key={column} className={styles.dropTarget} aria-label={`Drop a disc in column ${column + 1}`} aria-keyshortcuts={String(column + 1)} disabled={!enabled}
          onMouseEnter={() => setHovered(column)} onFocus={() => setFocused(column)} onBlur={() => setFocused(null)}
          onClick={() => {if (enabled) choose.current(column);}}>
          <span aria-hidden="true" className={`${styles.previewDisc} ${enabled && preview === column ? playerMark === 1 ? styles.redDisc : styles.yellowDisc : ""}`} />
          <span className={styles.dropNumber}>{column + 1}</span>
        </button>;
      })}
    </div>
    <div className={styles.connectBoard}>
      {board.map((mark, index) => <span key={index} className={styles.connectHole} role="img" aria-label={`Row ${Math.floor(index / 7) + 1}, column ${index % 7 + 1}: ${mark ? mark === 1 ? "red disc" : "yellow disc" : "empty"}`}>
        {mark !== 0 && <span key={fall?.slot === index ? fall.key : `settled-${index}`} className={`${styles.placedDisc} ${mark === 1 ? styles.redDisc : styles.yellowDisc} ${fall?.slot === index ? styles.fallingDisc : ""} ${!fall && winningCells.includes(index) ? styles.winningDisc : ""}`} style={{"--fall-rows": Math.floor(index / 7) + 1} as CSSProperties} />}
      </span>)}
      <div className={styles.connectColumnTargets}>
        {Array.from({length: 7}, (_, column) => {
          const enabled = canMove && !fall && board[column] === 0;
          return <button type="button" key={column} className={styles.columnTarget}
            aria-label={`Drop a disc in column ${column + 1}`} tabIndex={-1} disabled={!enabled}
            onMouseEnter={() => setHovered(column)}
            onClick={() => {if (enabled) choose.current(column);}} />;
        })}
      </div>
    </div>
  </div>;
}
