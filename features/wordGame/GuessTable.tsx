import {FC} from "react";
import {iGuess} from "types";
import {classNames} from "utils";
import {v4 as uuid} from "uuid";

const GuessTable: FC<{
  currentGuess: string[];
  guesses: iGuess[];
  gameOver: boolean;
}> = ({currentGuess, guesses, gameOver}) => {
  return (
    <div className="flex justify-center">
      <table className="table-auto">
        <tbody>
          {guesses.map((w) => {
            let guessString = "";
            w.word.forEach((L) => (guessString += L.letter));
            return <GuessRow key={uuid()} guess={w} />;
          })}
          {!gameOver && (
            <>
              <InputRow currentGuess={currentGuess} />
              <BlankRows nRows={5 - guesses.length} />
            </>
          )}
          {/* {gameOver && <GameOverModal />} */}
        </tbody>
      </table>
    </div>
  );
};

const GuessRow: FC<{guess: iGuess}> = ({guess}) => (
  <tr>
    {guess.word.map((L) => {
      return (
        <td key={uuid()}>
          <div className="h-16 w-16 mr-1 mt-1">
            <p
              className={classNames(
                "h-full p-6 text-xl flex justify-center font-bold border border-white",
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
        <div className={classNames("h-16 w-16 mt-1")}>
          <p className={classNames("h-full p-6 text-xl font-bold border border-white bg-foreground-alt-400")}>{g}</p>
        </div>
      </td>
    ))}
    {Array(5 - currentGuess.length)
      .fill(" ")
      .map((_) => (
        <td key={uuid()}>
          <div className="h-16 w-16 mt-1">
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
                <div className="h-16 w-16 mt-1">
                  <p className={classNames("h-full p-6 border border-foreground-alt-200 bg-foreground-alt-400")}>{_}</p>
                </div>
              </td>
            ))}
        </tr>
      ))}
  </>
);

export default GuessTable;
