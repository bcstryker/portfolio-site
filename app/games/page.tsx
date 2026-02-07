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
const numberTrain = [1, 2, 3, 4, 5];
const shapeOptions = [
  {id: "circle", className: "rounded-full bg-rose-400"},
  {id: "square", className: "rounded-lg bg-amber-400"},
  {id: "triangle", className: "bg-emerald-400 clip-triangle"},
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
  const base = getRandomItem(shapeOptions);
  const different = getRandomDistinct(shapeOptions, [base]);
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

function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

export default function GamesPage() {
  const [alphabetRound, setAlphabetRound] = useState({target: "A", choices: ["A", "B", "C"]});
  const [alphabetMessage, setAlphabetMessage] = useState("Tap the matching letter!");

  const [countRound, setCountRound] = useState({count: 3, choices: [2, 3, 4]});
  const [countMessage, setCountMessage] = useState("How many stars do you see?");

  const [mathRound, setMathRound] = useState({a: 1, b: 2, answer: 3, choices: [2, 3, 4]});
  const [mathMessage, setMathMessage] = useState("Pick the right answer.");

  const [wordRound, setWordRound] = useState({
    ...wordBank[0],
    letters: wordBank[0].word.toUpperCase().split(""),
  });
  const [wordProgress, setWordProgress] = useState<string[]>([]);
  const [wordMessage, setWordMessage] = useState("Tap the letters in order.");

  const [sameDifferentRound, setSameDifferentRound] = useState(() => ({
    base: shapeOptions[0],
    different: shapeOptions[1],
    items: [
      {...shapeOptions[0], key: "same-1"},
      {...shapeOptions[0], key: "same-2"},
      {...shapeOptions[1], key: "diff"},
    ],
  }));
  const [sameDifferentMessage, setSameDifferentMessage] = useState("Tap the one that is different.");

  const [trainProgress, setTrainProgress] = useState<number[]>([]);
  const [trainMessage, setTrainMessage] = useState("Tap the numbers in order.");
  const [trainOrder, setTrainOrder] = useState(() => [...numberTrain]);

  const [soundRound, setSoundRound] = useState(() => ({
    pick: soundBank[0],
    choices: ["C", "D", "S"],
  }));
  const [soundMessage, setSoundMessage] = useState("Tap the first sound.");

  const wordLetters = useMemo(() => wordRound.word.toUpperCase().split(""), [wordRound.word]);

  const handleAlphabetChoice = (choice: string) => {
    if (choice === alphabetRound.target) {
      setAlphabetMessage("Great job! New letter coming up.");
      setAlphabetRound(buildAlphabetRound());
    } else {
      setAlphabetMessage("Close! Try again.");
    }
  };

  const handleCountChoice = (choice: number) => {
    if (choice === countRound.count) {
      setCountMessage("You counted it! New stars coming.");
      setCountRound(buildCountingRound());
    } else {
      setCountMessage("Oops! Count again.");
    }
  };

  const handleMathChoice = (choice: number) => {
    if (choice === mathRound.answer) {
      setMathMessage("Nice work! New math coming.");
      setMathRound(buildMathRound());
    } else {
      setMathMessage("Not quite. Try again.");
    }
  };

  const handleWordChoice = (letter: string) => {
    if (isWordComplete) return;
    const expected = wordLetters[wordProgress.length];
    if (letter === expected) {
      const nextProgress = [...wordProgress, letter];
      setWordProgress(nextProgress);
      if (nextProgress.length === wordLetters.length) {
        setWordMessage("You spelled it! New word ready.");
      }
    } else {
      setWordMessage("Oops! Try the next letter in the word.");
    }
  };

  const resetWord = () => {
    setWordRound(buildWordRound());
    setWordProgress([]);
    setWordMessage("Tap the letters in order.");
  };

  const isWordComplete = wordProgress.length === wordLetters.length;

  useEffect(() => {
    setAlphabetRound(buildAlphabetRound());
    setCountRound(buildCountingRound());
    setMathRound(buildMathRound());
    setWordRound(buildWordRound());
    setSameDifferentRound(buildSameDifferentRound());
    setTrainOrder(shuffle(numberTrain));
    setSoundRound(buildSoundRound());
  }, []);

  const handleSameDifferentChoice = (choiceId: string) => {
    if (choiceId === sameDifferentRound.different.id) {
      setSameDifferentMessage("Nice spotting! New shapes coming.");
      setSameDifferentRound(buildSameDifferentRound());
    } else {
      setSameDifferentMessage("Try again. Find the different one.");
    }
  };

  const handleTrainChoice = (choice: number) => {
    const expected = numberTrain[trainProgress.length];
    if (choice === expected) {
      const nextProgress = [...trainProgress, choice];
      setTrainProgress(nextProgress);
      if (nextProgress.length === numberTrain.length) {
        setTrainMessage("Train complete! Tap New train.");
      } else {
        setTrainMessage("Great! Keep going.");
      }
    } else {
      setTrainMessage("Oops. Start from 1.");
      setTrainProgress([]);
    }
  };

  const resetTrain = () => {
    setTrainProgress([]);
    setTrainMessage("Tap the numbers in order.");
    setTrainOrder(shuffle(numberTrain));
  };

  const handleSoundChoice = (choice: string) => {
    if (choice === soundRound.pick.letter) {
      setSoundMessage("Yes! New word coming.");
      setSoundRound(buildSoundRound());
    } else {
      setSoundMessage("Not quite. Try again.");
    }
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
          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Back to portfolio
          </Link>
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
              <div className="text-right text-sm text-slate-600">{alphabetMessage}</div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {alphabetRound.choices.map((choice) => (
                <ChoiceButton key={choice} label={choice} onClick={() => handleAlphabetChoice(choice)} />
              ))}
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
              <p className="text-sm text-slate-600">{wordMessage}</p>
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
              {isWordComplete ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700">
                  Word complete!
                </span>
              ) : null}
            </div>
          </GameCard>

          <GameCard
            title="Counting Meadow"
            subtitle="Count the stars and pick the number."
            className="games-fade games-fade-delay-2"
          >
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6">
              <div className="flex flex-wrap gap-2">
                {Array.from({length: countRound.count}).map((_, index) => (
                  <span key={index} className="games-glow h-6 w-6 rounded-full bg-amber-400 shadow" />
                ))}
              </div>
              <div className="text-right text-sm text-slate-600">{countMessage}</div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {countRound.choices.map((choice) => (
                <ChoiceButton key={choice} label={String(choice)} onClick={() => handleCountChoice(choice)} />
              ))}
            </div>
          </GameCard>

          <GameCard title="Tiny Math" subtitle="Add the numbers together." className="games-fade games-fade-delay-3">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6">
              <p className="text-3xl font-semibold text-slate-900">
                {mathRound.a} + {mathRound.b} = ?
              </p>
              <p className="text-sm text-slate-600">{mathMessage}</p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {mathRound.choices.map((choice) => (
                <ChoiceButton key={choice} label={String(choice)} onClick={() => handleMathChoice(choice)} />
              ))}
            </div>
          </GameCard>

          <GameCard title="Same or Different" subtitle="Spot the one that is different." className="games-fade games-fade-delay-1">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5">
              <p className="text-sm text-slate-600">{sameDifferentMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setSameDifferentRound(buildSameDifferentRound());
                  setSameDifferentMessage("Tap the one that is different.");
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                New shapes
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              {sameDifferentRound.items.map((shape) => (
                <button
                  key={shape.key}
                  type="button"
                  onClick={() => handleSameDifferentChoice(shape.id)}
                  className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5"
                  aria-label={`Choose ${shape.id}`}
                >
                  <span className={`block h-10 w-10 ${shape.className}`} />
                </button>
              ))}
            </div>
          </GameCard>

          <GameCard title="Number Train" subtitle="Tap the numbers from 1 to 5." className="games-fade games-fade-delay-2">
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5">
              <p className="text-sm text-slate-600">{trainMessage}</p>
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
              {numberTrain.map((num) => (
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

          <GameCard title="First Sound Tap" subtitle={soundRound.pick.word.toUpperCase()} className="games-fade games-fade-delay-3">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>{soundRound.pick.clue}</span>
                <button
                  type="button"
                  onClick={() => speakText(`${soundRound.pick.word}. ${soundRound.pick.clue}`)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-base"
                  aria-label="Read the clue aloud"
                >
                  🔊
                </button>
              </div>
              <p className="text-sm text-slate-600">{soundMessage}</p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {soundRound.choices.map((choice) => (
                <ChoiceButton key={choice} label={choice} onClick={() => handleSoundChoice(choice)} />
              ))}
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
