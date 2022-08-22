import {FC, useState} from "react";
// import SubmitButton from "./SubmitButton";
import GuessTable from "./GuessTable";

const WordGame: FC<{answer: string}> = ({answer}) => {
  const [guesses, setGuesses] = useState<iGuess[]>([]);
  return (
    <div>
      <GuessTable guesses={guesses} setGuesses={setGuesses} answer={answer} />
      {/* <SubmitButton /> */}
    </div>
  );
};

const tmpData: iGame = {
  guesses: [
    {
      word: [
        {
          letter: "A",
          inWord: true,
          inPosition: false,
        },
        {
          letter: "B",
          inWord: false,
          inPosition: false,
        },
        {
          letter: "C",
          inWord: true,
          inPosition: true,
        },
        {
          letter: "D",
          inWord: false,
          inPosition: false,
        },
        {
          letter: "E",
          inWord: true,
          inPosition: false,
        },
      ],
    },
  ],
};

export interface iGame {
  guesses: iGuess[];
}

export interface iGuess {
  word: iLetter[];
}

export interface iLetter {
  letter: string;
  // currentPosition: number;
  inWord: boolean;
  inPosition: boolean;
}

export default WordGame;
