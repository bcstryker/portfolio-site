import {Dispatch, FC, SetStateAction, useEffect, useState} from "react";
import {classNames} from "utils";
import {iGuess} from ".";
import {v4 as uuid} from "uuid";

const GuessTable: FC<{guesses: iGuess[]; setGuesses: Dispatch<SetStateAction<iGuess[]>>; answer: string}> = ({
  // game,
  guesses,
  setGuesses,
  answer,
}) => {
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      if (/[A-Za-z]/.test(e.key) && e.key.length == 1)
        setCurrentGuess((guess) => (guess.length >= 5 ? [...guess] : [...guess, e.key.toUpperCase()]));
      if (e.key.toLowerCase() == "backspace") setCurrentGuess((c) => c.slice(0, -1));
      if (e.key.toLowerCase() == "enter") {
        console.log("Guess when pressing enter: ", currentGuess);
        guess(currentGuess, guesses, setGuesses, answer);
      }
    });
  }, []);
  // useEffect(() => console.log(currentGuess), [currentGuess]);
  return (
    <table className="table-auto">
      <tbody>
        {guesses.map((w) => {
          let guessString = "";
          w.word.forEach((L) => (guessString += L.letter));
          return <GuessRow key={guessString} guess={w} />;
        })}
        <InputRow currentGuess={currentGuess} />
        <BlankRows nRows={5 - guesses.length} />
      </tbody>
    </table>
  );
};

const GuessRow: FC<{guess: iGuess}> = ({guess}) => (
  <tr>
    {guess.word.map((L) => {
      return (
        <td key={uuid()}>
          <div className="h-16 w-16 mr-2">
            <p
              className={classNames(
                "h-full p-6 text-xl font-bold border border-white",
                L.inWord ? (L.inPosition ? "bg-accent-green" : "bg-accent-yellow") : "bg-foreground-alt-400"
              )}
            >
              {L.letter}
            </p>
          </div>
        </td>
      );
    })}
  </tr>
);

const InputRow: FC<{currentGuess: string[]}> = ({currentGuess}) => (
  <tr>
    {currentGuess.map((g) => (
      <td key={uuid()}>
        <div className="h-16 w-16 mt-2">
          <p className={classNames("h-full p-6 text-xl font-bold border border-white bg-foreground-alt-400")}>{g}</p>
        </div>
      </td>
    ))}
    {Array(5 - currentGuess.length)
      .fill(" ")
      .map((_) => (
        <td key={uuid()}>
          <div className="h-16 w-16 mt-2">
            <p className={classNames("h-full p-6 border border-foreground-alt-200 bg-foreground-alt-400")}>{_}</p>
          </div>
        </td>
      ))}
  </tr>
);

const BlankRows: FC<{nRows: number}> = ({nRows}) => (
  <>
    {Array(nRows)
      .fill(" ")
      .map((_) => (
        <tr key={uuid()}>
          {Array(5)
            .fill(" ")
            .map((_) => (
              <td key={uuid()}>
                <div className="h-16 w-16 mt-2">
                  <p className={classNames("h-full p-6 border border-foreground-alt-200 bg-foreground-alt-400")}>{_}</p>
                </div>
              </td>
            ))}
        </tr>
      ))}
  </>
);

const guess = (
  currentGuess: string[],
  guesses: iGuess[],
  setGuesses: Dispatch<SetStateAction<iGuess[]>>,
  answer: string
) => {
  const word = currentGuess.join("").toLowerCase();
  console.log("current guess: ", currentGuess);
  const newGuess = currentGuess.map((L) => {
    return {
      letter: L,
      inWord: answer.includes(L),
      inPosition: false,
    };
  });
  console.log(newGuess);
  setGuesses([...guesses, {word: newGuess}]);
  console.log(word, answer);
  if (word === answer) console.log("YOU WIN!");
};

export default GuessTable;
