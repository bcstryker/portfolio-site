"use client";

import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import type {ReactNode} from "react";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const numberChoices = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const wordBank = [
  {word: "cat", clue: "A pet that says meow."},
  {word: "dog", clue: "A pet that says woof."},
  {word: "sun", clue: "A bright star in the sky."},
  {word: "hat", clue: "You can wear it on your head."},
  {word: "car", clue: "It has wheels and goes vroom."},
  {word: "bee", clue: "It buzzes and makes honey."},
  {word: "cow", clue: "It says moo."},
  {word: "pig", clue: "It likes to oink."},
];
const soundBank = [
  {word: "cat", clue: "Starts like c in cat", letter: "C"},
  {word: "dog", clue: "Starts like d in dog", letter: "D"},
  {word: "sun", clue: "Starts like s in sun", letter: "S"},
  {word: "fish", clue: "Starts like f in fish", letter: "F"},
  {word: "monkey", clue: "Starts like m in monkey", letter: "M"},
  {word: "bird", clue: "Starts like b in bird", letter: "B"},
];
const trainRange = {min: 1, max: 20, length: 5};
const shapeOptions = [
  {id: "circle", className: "rounded-full bg-rose-400"},
  {id: "square", className: "rounded-lg bg-amber-400"},
  {id: "triangle", className: "bg-emerald-400 clip-triangle"},
];
const colorOptions = [
  {id: "rose", label: "red", className: "bg-rose-400"},
  {id: "amber", label: "yellow", className: "bg-amber-400"},
  {id: "emerald", label: "green", className: "bg-emerald-400"},
  {id: "sky", label: "blue", className: "bg-sky-400"},
];

function getRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getRandomDistinct<T>(items: T[], exclude: T[]) {
  const filtered = items.filter((item) => !exclude.includes(item));
  return getRandomItem(filtered);
}

function buildAlphabetRound() {
  const target = getRandomItem(alphabet);
  const choices = new Set([target]);
  while (choices.size < 3) {
    choices.add(getRandomItem(alphabet));
  }
  return {target, choices: shuffle(Array.from(choices))};
}

function buildCountingRound() {
  const count = getRandomItem(numberChoices.slice(0, 6));
  const choices = new Set([count]);
  while (choices.size < 3) {
    choices.add(getRandomItem(numberChoices));
  }
  return {count, choices: shuffle(Array.from(choices))};
}

function buildMathRound() {
  let a = Math.floor(Math.random() * 4);
  let b = Math.floor(Math.random() * 4);
  if (a + b > 5) {
    b = 5 - a;
  }
  const answer = a + b;
  const choices = new Set([answer]);
  while (choices.size < 3) {
    choices.add(Math.floor(Math.random() * 7));
  }
  return {a, b, answer, choices: shuffle(Array.from(choices))};
}

function buildWordRound() {
  const pick = getRandomItem(wordBank);
  return {
    ...pick,
    letters: shuffle(pick.word.toUpperCase().split("")),
  };
}

function buildSameDifferentRound() {
  const baseShape = getRandomItem(shapeOptions).id;
  const baseColor = getRandomItem(colorOptions).id;
  const mode = Math.random() < 0.5 ? "shape" : "color";
  let differentShape = baseShape;
  let differentColor = baseColor;
  if (mode === "shape") {
    differentShape = getRandomItem(shapeOptions.filter((s) => s.id !== baseShape)).id;
  } else {
    differentColor = getRandomItem(colorOptions.filter((c) => c.id !== baseColor)).id;
  }
  const base = {shape: baseShape, color: baseColor};
  const different = {shape: differentShape, color: differentColor};
  const items = shuffle([
    {...base, key: "same-1"},
    {...base, key: "same-2"},
    {...different, key: "diff"},
  ]);
  return {base, different, items};
}

function buildSoundRound() {
  const pick = getRandomItem(soundBank);
  const choices = new Set([pick.letter]);
  while (choices.size < 3) {
    choices.add(getRandomItem(soundBank).letter);
  }
  return {pick, choices: shuffle(Array.from(choices))};
}

function buildTrainRound() {
  const maxStart = trainRange.max - trainRange.length + 1;
  const start = Math.floor(Math.random() * maxStart) + trainRange.min;
  const set = Array.from({length: trainRange.length}, (_, index) => start + index);
  return {set, order: shuffle(set)};
}

function sameArray(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function buildDifferent<T>(builder: () => T, isSame: (next: T) => boolean, attempts = 6) {
  let next = builder();
  let remaining = attempts;
  while (remaining > 0 && isSame(next)) {
    next = builder();
    remaining -= 1;
  }
  return next;
}

function shapeLabel(shapeId: string) {
  return shapeId === "triangle" ? "triangle" : shapeId;
}

function shapeClass(shapeId: string) {
  if (shapeId === "triangle") return "clip-triangle";
  if (shapeId === "square") return "rounded-lg";
  return "rounded-full";
}

function numberToWords(value: number) {
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
  ];
  return words[value] ?? String(value);
}

function samePatternSlots(a: {shape: string; color: string}[], b: {shape: string; color: string}[]) {
  if (a.length !== b.length) return false;
  return a.every((slot, index) => slot.shape === b[index].shape && slot.color === b[index].color);
}

function buildPatternRound() {
  const combos = shapeOptions.flatMap((shape) =>
    colorOptions.map((color) => ({shape: shape.id, color: color.id}))
  );
  const base = shuffle(combos).slice(0, 3);
  const slots = [...base, ...base];
  const missingIndex = Math.floor(Math.random() * slots.length);
  const missing = slots[missingIndex];
  const distractors = new Set<string>([`${missing.color}-${missing.shape}`]);
  while (distractors.size < 3) {
    const candidate = {
      shape: getRandomItem(shapeOptions).id,
      color: getRandomItem(colorOptions).id,
    };
    distractors.add(`${candidate.color}-${candidate.shape}`);
  }
  const choices = shuffle(
    Array.from(distractors).map((key) => {
      const [color, shape] = key.split("-");
      return {color, shape};
    })
  );
  return {slots, missingIndex, missing, choices};
}

function GameCard({
  children,
  title,
  subtitle,
  className,
}: {
  children: ReactNode;
  title: string;
  subtitle: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border-2 border-white/70 bg-white/80 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur ${className ?? ""}`}
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        <div className="text-sm text-slate-600">{subtitle}</div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ChoiceButton({label, onClick, disabled}: {label: string; onClick: () => void; disabled?: boolean}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border-2 px-5 py-3 text-lg font-semibold transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          : "border-slate-200 bg-white text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function playChime() {
  if (typeof window === "undefined") return;
  const AudioContextRef = window.AudioContext || (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
  if (!AudioContextRef) return;
  const ctx = new AudioContextRef();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + index * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.08 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.2);
  });
  setTimeout(() => ctx.close(), 500);
}

export default function GamesPage() {
  const [alphabetRound, setAlphabetRound] = useState({target: "A", choices: ["A", "B", "C"]});
  const [alphabetMessage, setAlphabetMessage] = useState("Tap the matching letter!");
  const [alphabetCorrect, setAlphabetCorrect] = useState(false);

  const [countRound, setCountRound] = useState({count: 3, choices: [2, 3, 4]});
  const [countMessage, setCountMessage] = useState("How many dots do you see?");
  const [countCorrect, setCountCorrect] = useState(false);

  const [mathRound, setMathRound] = useState({a: 1, b: 2, answer: 3, choices: [2, 3, 4]});
  const [mathMessage, setMathMessage] = useState("Pick the right answer.");
  const [mathCorrect, setMathCorrect] = useState(false);

  const [wordRound, setWordRound] = useState({
    ...wordBank[0],
    letters: wordBank[0].word.toUpperCase().split(""),
  });
  const [wordProgress, setWordProgress] = useState<string[]>([]);
  const [wordMessage, setWordMessage] = useState("Tap the letters in order.");
  const [wordCorrect, setWordCorrect] = useState(false);

  const [sameDifferentRound, setSameDifferentRound] = useState(() => ({
    base: {shape: "circle", color: "rose"},
    different: {shape: "square", color: "rose"},
    items: [
      {shape: "circle", color: "rose", key: "same-1"},
      {shape: "circle", color: "rose", key: "same-2"},
      {shape: "square", color: "rose", key: "diff"},
    ],
  }));
  const [sameDifferentMessage, setSameDifferentMessage] = useState("Tap the one that is different.");
  const [sameDifferentCorrect, setSameDifferentCorrect] = useState(false);

  const [trainProgress, setTrainProgress] = useState<number[]>([]);
  const [trainMessage, setTrainMessage] = useState("Tap the numbers in order.");
  const [trainCorrect, setTrainCorrect] = useState(false);
  const [trainSet, setTrainSet] = useState<number[]>([1, 2, 3, 4, 5]);
  const [trainOrder, setTrainOrder] = useState<number[]>([1, 2, 3, 4, 5]);

  const [soundRound, setSoundRound] = useState(() => ({
    pick: soundBank[0],
    choices: ["C", "D", "S"],
  }));
  const [soundMessage, setSoundMessage] = useState("Tap the first sound.");
  const [soundCorrect, setSoundCorrect] = useState(false);

  const [patternRound, setPatternRound] = useState(() => ({
    slots: [
      {shape: "circle", color: "rose"},
      {shape: "square", color: "amber"},
      {shape: "triangle", color: "emerald"},
      {shape: "circle", color: "rose"},
      {shape: "square", color: "amber"},
      {shape: "triangle", color: "emerald"},
    ],
    missingIndex: 4,
    missing: {shape: "square", color: "amber"},
    choices: [
      {shape: "square", color: "amber"},
      {shape: "circle", color: "rose"},
      {shape: "square", color: "sky"},
    ],
  }));
  const [patternMessage, setPatternMessage] = useState("Pick the missing shape.");
  const [patternCorrect, setPatternCorrect] = useState(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");

  const wordLetters = useMemo(() => wordRound.word.toUpperCase().split(""), [wordRound.word]);

  const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI);

  const speakText = (text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    if (selectedVoice) utterance.voice = selectedVoice;
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  };

  const speakOption = (value: string, onEnd?: () => void) => {
    const normalized = /^[A-Z]$/.test(value) ? value.toLowerCase() : value;
    speakText(normalized, onEnd);
  };

  const handleAlphabetChoice = (choice: string) => {
    const isCorrect = choice === alphabetRound.target;
    speakOption(choice, isCorrect ? playChime : undefined);
    if (choice === alphabetRound.target) {
      setAlphabetMessage("Great job! Tap new letter to keep going.");
      setAlphabetCorrect(true);
    } else {
      setAlphabetMessage("Close! Try again.");
    }
  };

  const resetAlphabet = () => {
    setAlphabetRound(buildDifferent(buildAlphabetRound, (next) => next.target === alphabetRound.target));
    setAlphabetMessage("Tap the matching letter!");
    setAlphabetCorrect(false);
  };

  const handleCountChoice = (choice: number) => {
    const isCorrect = choice === countRound.count;
    speakOption(String(choice), isCorrect ? playChime : undefined);
    if (choice === countRound.count) {
      setCountMessage("You counted it! Tap new dots to keep going.");
      setCountCorrect(true);
    } else {
      setCountMessage("Oops! Count again.");
    }
  };

  const resetCount = () => {
    setCountRound(buildDifferent(buildCountingRound, (next) => next.count === countRound.count));
    setCountMessage("How many dots do you see?");
    setCountCorrect(false);
  };

  const handleMathChoice = (choice: number) => {
    const isCorrect = choice === mathRound.answer;
    if (choice === mathRound.answer) {
      const expression = `${numberToWords(mathRound.a)} plus ${numberToWords(mathRound.b)} equals ${numberToWords(
        mathRound.answer
      )}`;
      speakText(expression, playChime);
      setMathMessage("Nice work! Tap new math to keep going.");
      setMathCorrect(true);
    } else {
      speakOption(String(choice));
      setMathMessage("Not quite. Try again.");
    }
  };

  const resetMath = () => {
    setMathRound(buildDifferent(buildMathRound, (next) => next.a === mathRound.a && next.b === mathRound.b));
    setMathMessage("Pick the right answer.");
    setMathCorrect(false);
  };

  const handleWordChoice = (letter: string) => {
    if (isWordComplete) return;
    const isLast = wordProgress.length + 1 === wordLetters.length;
    const isCorrect = letter === wordLetters[wordProgress.length];
    speakOption(letter, isCorrect && isLast ? playChime : undefined);
    const expected = wordLetters[wordProgress.length];
    if (letter === expected) {
      const nextProgress = [...wordProgress, letter];
      setWordProgress(nextProgress);
      if (nextProgress.length === wordLetters.length) {
        setWordMessage("You spelled it! Tap new word to keep going.");
        setWordCorrect(true);
      }
    } else {
      setWordMessage("Oops! Try the next letter in the word.");
    }
  };

  const resetWord = () => {
    setWordRound(buildDifferent(buildWordRound, (next) => next.word === wordRound.word));
    setWordProgress([]);
    setWordMessage("Tap the letters in order.");
    setWordCorrect(false);
  };

  const isWordComplete = wordProgress.length === wordLetters.length;

  useEffect(() => {
    setAlphabetRound(buildAlphabetRound());
    setCountRound(buildCountingRound());
    setMathRound(buildMathRound());
    setWordRound(buildWordRound());
    setSameDifferentRound(buildSameDifferentRound());
    const trainRound = buildTrainRound();
    setTrainSet(trainRound.set);
    setTrainOrder(trainRound.order);
    setSoundRound(buildSoundRound());
    setPatternRound(buildPatternRound());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    const saved = window.localStorage.getItem("gamesVoiceURI");
    if (saved) setVoiceURI(saved);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (voiceURI) {
      window.localStorage.setItem("gamesVoiceURI", voiceURI);
    } else {
      window.localStorage.removeItem("gamesVoiceURI");
    }
  }, [voiceURI]);

  const handleSameDifferentChoice = (choice: {shape: string; color: string}) => {
    const isCorrect =
      choice.shape === sameDifferentRound.different.shape && choice.color === sameDifferentRound.different.color;
    const colorLabel = colorOptions.find((color) => color.id === choice.color)?.label ?? choice.color;
    speakOption(`${colorLabel} ${shapeLabel(choice.shape)}`, isCorrect ? playChime : undefined);
    if (isCorrect) {
      setSameDifferentMessage("Nice spotting! Tap new shapes to keep going.");
      setSameDifferentCorrect(true);
    } else {
      setSameDifferentMessage("Try again. Find the different one.");
    }
  };

  const resetSameDifferent = () => {
    setSameDifferentRound(
      buildDifferent(
        buildSameDifferentRound,
        (next) =>
          next.different.shape === sameDifferentRound.different.shape &&
          next.different.color === sameDifferentRound.different.color &&
          next.base.shape === sameDifferentRound.base.shape &&
          next.base.color === sameDifferentRound.base.color
      )
    );
    setSameDifferentMessage("Tap the one that is different.");
    setSameDifferentCorrect(false);
  };

  const handleTrainChoice = (choice: number) => {
    const expected = trainSet[trainProgress.length];
    const isCorrect = choice === expected;
    const isLast = trainProgress.length + 1 === trainSet.length;
    speakOption(String(choice), isCorrect && isLast ? playChime : undefined);
    if (choice === expected) {
      const nextProgress = [...trainProgress, choice];
      setTrainProgress(nextProgress);
      if (nextProgress.length === trainSet.length) {
        setTrainMessage("Train complete! Tap new train.");
        setTrainCorrect(true);
      } else {
        setTrainMessage("Great! Keep going.");
      }
    } else {
      setTrainMessage("Oops. Start from the first number.");
      setTrainProgress([]);
    }
  };

  const resetTrain = () => {
    setTrainProgress([]);
    setTrainMessage("Tap the numbers in order.");
    const nextTrain = buildDifferent(buildTrainRound, (next) => sameArray(next.set, trainSet));
    setTrainSet(nextTrain.set);
    setTrainOrder(nextTrain.order);
    setTrainCorrect(false);
  };

  const handleSoundChoice = (choice: string) => {
    const isCorrect = choice === soundRound.pick.letter;
    speakOption(choice, isCorrect ? playChime : undefined);
    if (choice === soundRound.pick.letter) {
      setSoundMessage("Yes! Tap new word to keep going.");
      setSoundCorrect(true);
    } else {
      setSoundMessage("Not quite. Try again.");
    }
  };

  const resetSound = () => {
    setSoundRound(buildDifferent(buildSoundRound, (next) => next.pick.word === soundRound.pick.word));
    setSoundMessage("Tap the first sound.");
    setSoundCorrect(false);
  };

  const handlePatternChoice = (choice: {shape: string; color: string}) => {
    const isCorrect = choice.shape === patternRound.missing.shape && choice.color === patternRound.missing.color;
    const colorLabel = colorOptions.find((color) => color.id === choice.color)?.label ?? choice.color;
    speakOption(`${colorLabel} ${shapeLabel(choice.shape)}`, isCorrect ? playChime : undefined);
    if (isCorrect) {
      setPatternMessage("Nice work! Tap new pattern to keep going.");
      setPatternCorrect(true);
    } else {
      setPatternMessage("Not quite. Try again.");
    }
  };

  const resetPattern = () => {
    setPatternRound(
      buildDifferent(
        buildPatternRound,
        (next) =>
          next.missing.shape === patternRound.missing.shape &&
          next.missing.color === patternRound.missing.color &&
          samePatternSlots(next.slots, patternRound.slots)
      )
    );
    setPatternMessage("Pick the missing shape.");
    setPatternCorrect(false);
  };

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,#fef9c3_10%,#d1fae5_45%,#bfdbfe_100%)]"
      style={{fontFamily: "\"Trebuchet MS\", \"Comic Sans MS\", \"Segoe UI\", sans-serif"}}
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-rose-200/70 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-20 h-32 w-32 rounded-full bg-amber-200/70 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-200/70 blur-3xl" />
        <header className="container relative flex flex-wrap items-center justify-between gap-4 py-6 games-fade">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-600">Play & Learn</p>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Games for Tiny Learners</h1>
            <p className="max-w-xl text-sm text-slate-600">
              Gentle, tap-friendly games that help kids practice letters, spelling, counting, and early math.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Voice
              <select
                value={voiceURI}
                onChange={(event) => setVoiceURI(event.target.value)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                disabled={voices.length === 0}
              >
                <option value="">System default</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </label>
            <Link
              href="/"
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Back to portfolio
            </Link>
          </div>
        </header>
      </div>

      <main className="container pb-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <GameCard title="Alphabet Pop" subtitle="Find the matching letter." className="games-fade games-fade-delay-1">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Letter</p>
                <p className="mt-2 text-5xl font-semibold text-slate-900">{alphabetRound.target}</p>
              </div>
              <div className="text-right text-sm text-slate-600">
                {alphabetCorrect ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Correct!
                  </span>
                ) : (
                  <p>{alphabetMessage}</p>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {alphabetRound.choices.map((choice) => (
                <ChoiceButton key={choice} label={choice} onClick={() => handleAlphabetChoice(choice)} />
              ))}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={resetAlphabet}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New letter
              </button>
            </div>
          </GameCard>

          <GameCard
            title="Spelling Builder"
            subtitle={
              <span className="inline-flex items-center gap-2">
                <span>{wordRound.clue}</span>
                <button
                  type="button"
                  onClick={() => speakText(wordRound.clue)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-xs"
                  aria-label="Read the clue aloud"
                >
                  🔊
                </button>
              </span>
            }
            className="games-fade games-fade-delay-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5">
              <div className="flex gap-3">
                {wordLetters.map((letter, index) => (
                  <span
                    key={`${letter}-${index}`}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-semibold ${
                      wordProgress[index]
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {wordProgress[index] ?? ""}
                  </span>
                ))}
              </div>
              <div className="text-sm text-slate-600">
                {wordCorrect ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Correct!
                  </span>
                ) : (
                  <p>{wordMessage}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {wordRound.letters.map((letter, index) => (
                <ChoiceButton
                  key={`${letter}-${index}`}
                  label={letter}
                  onClick={() => handleWordChoice(letter)}
                  disabled={
                    isWordComplete ||
                    (wordProgress.includes(letter) && !wordLetters.slice(wordProgress.length).includes(letter))
                  }
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setWordProgress([]);
                  setWordMessage("Tap the letters in order.");
                  setWordCorrect(false);
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={resetWord}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New word
              </button>
            </div>
          </GameCard>

          <GameCard
            title="Counting Meadow"
            subtitle="Count the dots and pick the number."
            className="games-fade games-fade-delay-2"
          >
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6">
              <div className="flex flex-wrap gap-2">
                {Array.from({length: countRound.count}).map((_, index) => (
                  <span key={index} className="games-glow h-6 w-6 rounded-full bg-amber-400 shadow" />
                ))}
              </div>
              <div className="text-right text-sm text-slate-600">
                {countCorrect ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Correct!
                  </span>
                ) : (
                  <p>{countMessage}</p>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {countRound.choices.map((choice) => (
                <ChoiceButton key={choice} label={String(choice)} onClick={() => handleCountChoice(choice)} />
              ))}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={resetCount}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New dots
              </button>
            </div>
          </GameCard>

          <GameCard title="Tiny Math" subtitle="Add the numbers together." className="games-fade games-fade-delay-3">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6">
              <p className="text-3xl font-semibold text-slate-900">
                {mathRound.a} + {mathRound.b} = {mathCorrect ? mathRound.answer : "?"}
              </p>
              <div className="text-right text-sm text-slate-600">
                {mathCorrect ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Correct!
                  </span>
                ) : (
                  <p>{mathMessage}</p>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {mathRound.choices.map((choice) => (
                <ChoiceButton key={choice} label={String(choice)} onClick={() => handleMathChoice(choice)} />
              ))}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={resetMath}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New math
              </button>
            </div>
          </GameCard>

          <GameCard title="Same or Different" subtitle="Spot the one that is different." className="games-fade games-fade-delay-1">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5">
              <div className="text-sm text-slate-600">
                {sameDifferentCorrect ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Correct!
                  </span>
                ) : (
                  <p>{sameDifferentMessage}</p>
                )}
              </div>
              <button
                type="button"
                onClick={resetSameDifferent}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New shapes
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              {sameDifferentRound.items.map((item) => {
                const colorClass = colorOptions.find((color) => color.id === item.color)?.className ?? "bg-slate-200";
                return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSameDifferentChoice(item)}
                  className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5"
                  aria-label={`Choose ${item.color} ${item.shape}`}
                >
                  <span className={`block h-10 w-10 ${shapeClass(item.shape)} ${colorClass}`} />
                </button>
              )})}
            </div>
          </GameCard>

          <GameCard title="Pattern Finder" subtitle="Pick the missing colored shape." className="games-fade games-fade-delay-2">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5">
              <div className="text-sm text-slate-600">
                {patternCorrect ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Correct!
                  </span>
                ) : (
                  <p>{patternMessage}</p>
                )}
              </div>
              <button
                type="button"
                onClick={resetPattern}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New pattern
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              {patternRound.slots.map((slot, index) => {
                const colorClass = colorOptions.find((color) => color.id === slot.color)?.className ?? "bg-slate-200";
                const missingColorClass =
                  colorOptions.find((color) => color.id === patternRound.missing.color)?.className ?? "bg-slate-200";
                return (
                  <div
                    key={`${slot.shape}-${slot.color}-${index}`}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white"
                  >
                    {index === patternRound.missingIndex ? (
                      patternCorrect ? (
                        <span
                          className={`h-10 w-10 ${shapeClass(patternRound.missing.shape)} ${missingColorClass}`}
                        />
                      ) : (
                        <span className="h-10 w-10 rounded-lg border-2 border-dashed border-slate-300" />
                      )
                    ) : (
                      <span className={`h-10 w-10 ${shapeClass(slot.shape)} ${colorClass}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {patternRound.choices.map((choice, index) => {
                const colorClass = colorOptions.find((color) => color.id === choice.color)?.className ?? "bg-slate-200";
                return (
                  <button
                    key={`${choice.shape}-${choice.color}-${index}`}
                    type="button"
                    onClick={() => handlePatternChoice(choice)}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5"
                    aria-label={`Choose ${choice.color} ${choice.shape}`}
                  >
                    <span className={`h-10 w-10 ${shapeClass(choice.shape)} ${colorClass}`} />
                  </button>
                );
              })}
            </div>
          </GameCard>

          <GameCard title="Number Train" subtitle="Tap the numbers in order." className="games-fade games-fade-delay-2">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5">
              <div className="text-sm text-slate-600">
                {trainCorrect ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Correct!
                  </span>
                ) : (
                  <p>{trainMessage}</p>
                )}
              </div>
              <button
                type="button"
                onClick={resetTrain}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New train
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {trainOrder.map((num) => (
                <ChoiceButton
                  key={num}
                  label={String(num)}
                  onClick={() => handleTrainChoice(num)}
                  disabled={trainProgress.includes(num)}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {trainSet.map((num) => (
                <span
                  key={`track-${num}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl text-base font-semibold ${
                    trainProgress.includes(num) ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {num}
                </span>
              ))}
            </div>
          </GameCard>

          <GameCard title="First Sound Tap" subtitle="Tap the first sound you hear." className="games-fade games-fade-delay-3">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => speakText(soundRound.pick.word)}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-xl"
                  aria-label="Play the word"
                >
                  🔊
                </button>
              </div>
              <div className="text-sm text-slate-600">
                {soundCorrect ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Correct!
                  </span>
                ) : (
                  <p>{soundMessage}</p>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {soundRound.choices.map((choice) => (
                <ChoiceButton key={choice} label={choice} onClick={() => handleSoundChoice(choice)} />
              ))}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={resetSound}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New word
              </button>
            </div>
          </GameCard>
        </div>

        <section className="mt-12 rounded-3xl border border-white/70 bg-white/70 p-6 text-sm text-slate-600 games-fade games-fade-delay-3">
          <p className="text-base font-semibold text-slate-900">More games to come</p>
          <p className="mt-2">
            As the kids grow, we can add phonics, sight words, skip counting, and puzzle-style games. Tell me what they
            get excited about and I will build the next set.
          </p>
        </section>
      </main>
    </div>
  );
}
