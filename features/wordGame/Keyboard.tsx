import {Dispatch, FC, SetStateAction} from "react";
import {iGuess, iLetter} from "types";
import {classNames} from "utils";
import {v4 as uuid} from "uuid";

const Keyboard: FC<props> = ({className, setPressedKey, setShit, guesses}) => {
  return (
    <div className={classNames(className)}>
      <div className="w-full flex justify-center">
        {row1.split("").map((c) => (
          <KeyboardChar key={c} c={c} setPressedKey={setPressedKey} setShit={setShit} guesses={guesses} />
        ))}
      </div>
      <div className="w-full flex justify-center mt-1">
        {row2.split("").map((c) => (
          <KeyboardChar key={c} c={c} setPressedKey={setPressedKey} setShit={setShit} guesses={guesses} />
        ))}
      </div>
      <div className="w-full flex justify-center mt-1">
        <p
          className="hover:cursor-pointer bg-foreground-alt-300 border border-white rounded-md py-4 px-2 mr-1"
          onClick={() => {
            setPressedKey("enter");
            setShit(uuid());
          }}
        >
          {"ENTER"}
        </p>
        {row3.split("").map((c) => (
          <KeyboardChar key={c} c={c} setPressedKey={setPressedKey} setShit={setShit} guesses={guesses} />
        ))}
        <p
          className="hover:cursor-pointer bg-foreground-alt-300 border border-white rounded-md py-4 px-2"
          onClick={() => {
            setPressedKey("backspace");
            setShit(uuid());
          }}
        >
          &#9003;
        </p>
      </div>
    </div>
  );
};

const KeyboardChar: FC<{
  c: string;
  guesses: iGuess[];
  setPressedKey: Dispatch<SetStateAction<string>>;
  setShit: Dispatch<SetStateAction<string>>;
}> = ({c, guesses, setPressedKey, setShit}) => {
  let guessedLetter: iLetter | null = null;
  for (let i = 0; i < guesses.length; i++)
    for (let j = 0; j < 5; j++) if (guesses[i].word[j].letter.toLowerCase() === c) guessedLetter = guesses[i].word[j];

  const bgColor =
    guessedLetter !== null
      ? guessedLetter.inWord
        ? guessedLetter.inPosition
          ? "bg-accent-green"
          : "bg-accent-yellow"
        : "bg-foreground-alt-400"
      : "bg-foreground-alt-300";
  return (
    <p
      className={classNames("hover:cursor-pointer border border-white rounded-md py-4 px-2 mr-1", bgColor)}
      onClick={() => {
        setPressedKey(c);
        setShit(uuid());
      }}
    >
      {c.toUpperCase()}
    </p>
  );
};

const row1 = "qwertyuiop";
const row2 = "asdfghjkl";
const row3 = "zxcvbnm";

interface props {
  className?: string;
  setPressedKey: Dispatch<SetStateAction<string>>;
  setShit: Dispatch<SetStateAction<string>>;
  guesses: iGuess[];
}

export default Keyboard;
