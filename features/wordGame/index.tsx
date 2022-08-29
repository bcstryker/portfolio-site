import {Dispatch, FC, SetStateAction, useCallback, useEffect, useState} from "react";
// import Keyboard from "./Keyboard";
import GuessTable from "./GuessTable";
import {allWords} from "features/wordGame/fiveLetterWords";
import {v4 as uuid} from "uuid";
import {iGuess} from "types";

const WordGame: FC<{answer: string}> = ({answer}) => {
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<iGuess[]>([]);
  const [pressedKey, setPressedKey] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [shit, setShit] = useState("");
  // todo
  // - add Game Over modal with you won or you lost, guesses/6, game reset
  // - add keyboard with submit or guess button.
  //    already guessed letters should have background to background color in guess row
  // - fix text background color for duplicate letters. example below
  //    answer is PLEAT, you guess TREAT,
  //    first t should not have yellow background
  //    because second t is already in correct place
  //    and there is only one t in the word

  const handleUserKeyPress = useCallback((e: KeyboardEvent) => {
    setPressedKey(e.key);
    setShit(uuid());
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", handleUserKeyPress);
  }, [handleUserKeyPress]);
  useEffect(() => {
    if (guesses.length === 6) return;
    if (/[A-Za-z]/.test(pressedKey) && pressedKey.length == 1) {
      const letter = pressedKey.toUpperCase();
      if (currentGuess.length < 5) setCurrentGuess((prevGuess) => [...prevGuess, letter]);
      console.log(currentGuess);
    }
    if (pressedKey.toLowerCase() == "backspace") setCurrentGuess((c) => c.slice(0, -1));
    if (pressedKey.toLowerCase() == "enter") {
      guess(currentGuess, setCurrentGuess, guesses, setGuesses, answer, setGameOver);
    }
  }, [shit]);

  return (
    <div>
      <GuessTable currentGuess={currentGuess} guesses={guesses} gameOver={gameOver} />
      {/* <Keyboard /> */}
    </div>
  );
};

const guess = (
  currentGuess: string[],
  setCurrentGuess: Dispatch<SetStateAction<string[]>>,
  guesses: iGuess[],
  setGuesses: Dispatch<SetStateAction<iGuess[]>>,
  answer: string,
  setGameOver: Dispatch<SetStateAction<boolean>>
) => {
  const word = currentGuess.join("").toLowerCase();
  if (!allWords.includes(word)) {
    console.log("That's not a word");
    return;
  }

  const newGuess = currentGuess.map((L, i) => {
    return {
      letter: L,
      inWord: answer.includes(L.toLowerCase()),
      inPosition: answer[i] === L.toLowerCase(),
    };
  });
  setGuesses([...guesses, {word: newGuess}]);
  setCurrentGuess([]);
  if (word === answer) console.log("YOU WIN!");
  if (guesses.length === 5) setGameOver(true);
};

export default WordGame;
