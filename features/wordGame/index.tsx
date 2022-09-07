import {Dispatch, FC, SetStateAction, useCallback, useEffect, useState} from "react";
import GuessTable from "./GuessTable";
import {allWords} from "features/wordGame/fiveLetterWords";
import {v4 as uuid} from "uuid";
import {iGuess} from "types";
import Keyboard from "./Keyboard";
import {AppDispatch, useAppDispatch} from "store";
import {ThemeActions} from "store/theme";
import Confetti from "components/Confetti";
import Modal from "components/Modal";
import Button from "components/Button";
import {useRouter} from "next/router";
import {toast} from "react-toastify";

const WordGame: FC<{answer: string}> = ({answer}) => {
  console.log(answer);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<iGuess[]>([]);
  const [pressedKey, setPressedKey] = useState("");
  const [shit, setShit] = useState("");

  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = () => setIsOpen(false);
  const [modalText, setModalText] = useState("Game Over");
  const [gameOver, setGameOver] = useState(false);
  const router = useRouter();

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
    }
    if (pressedKey.toLowerCase() == "backspace") setCurrentGuess((c) => c.slice(0, -1));
    if (pressedKey.toLowerCase() == "enter") {
      guess(currentGuess, setCurrentGuess, guesses, setGuesses, answer, setGameOver, dispatch, setIsOpen, setModalText);
    }
  }, [shit]);

  return (
    <div>
      <Confetti />
      <Modal isOpen={isOpen} closeModal={closeModal} title="Game Over">
        <p className="text-xl text-primary mb-5">{modalText}</p>
        <Button
          onClick={() => {
            router.reload();
          }}
        >
          Play Again
        </Button>
      </Modal>
      <GuessTable currentGuess={currentGuess} guesses={guesses} gameOver={gameOver} />
      <Keyboard className="mt-10" setPressedKey={setPressedKey} setShit={setShit} guesses={guesses} />
    </div>
  );
};

const guess = (
  currentGuess: string[],
  setCurrentGuess: Dispatch<SetStateAction<string[]>>,
  guesses: iGuess[],
  setGuesses: Dispatch<SetStateAction<iGuess[]>>,
  answer: string,
  setGameOver: Dispatch<SetStateAction<boolean>>,
  dispatch: AppDispatch,
  setIsOpen: Dispatch<SetStateAction<boolean>>,
  setModalText: Dispatch<SetStateAction<string>>
) => {
  const word = currentGuess.join("").toLowerCase();
  if (!allWords.includes(word)) {
    console.log("That's not a word");
    toast.error("Not in word list");
    return;
  }

  const newGuess = currentGuess.map((L, i) => {
    const guessString = currentGuess.join("").toLowerCase();
    const l: string = L.toLowerCase();
    const nInGuess = guessString.split(l).length - 1;
    const nInAnswer = answer.split(l).length - 1;
    const otherIsBest =
      answer[i] !== l &&
      ((guessString.slice(0, i).includes(l) && answer[getPosition(guessString, l, 1)] == l) ||
        (guessString.slice(i).includes(l) && answer[getPosition(guessString, l, 2)] == l));
    const inWord =
      nInAnswer == 0
        ? false
        : nInAnswer == 1
        ? otherIsBest
          ? false
          : true
        : nInAnswer == 2 && nInGuess == 2
        ? true
        : false;
    const inPosition = answer[i] === l;
    return {
      letter: L,
      inWord: inWord,
      inPosition: inPosition,
    };
  });
  setGuesses([...guesses, {word: newGuess}]);
  setCurrentGuess([]);
  if (word === answer) {
    setModalText("You Win!");
    dispatch(ThemeActions.setIsConfettiOn(true));
    setIsOpen(true);
  }
  if (guesses.length === 5) {
    setGameOver(true);
    setModalText("You Loose :(");
    setIsOpen(true);
  }
};

const getPosition = (s: string, subString: string, index: number) => {
  return s.split(subString, index).join(subString).length;
};

export default WordGame;
