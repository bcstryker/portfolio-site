import WordGame from "features/wordGame";
import {FC} from "react";
import {StrykerPage} from "../types";
import {words} from "features/wordGame/fiveLetterWords";

const answer = words[Math.floor(Math.random() * words.length)];
// const answer = "treat";

const Home: StrykerPage = () => {
  return (
    <>
      <div className="block xl:flex mb-8 sm:mb-10">
        <div className="w-full flex justify-center">
          <WordGame answer={answer} />
        </div>
      </div>
    </>
  );
};

const PageTitle: FC = () => {
  return (
    <>
      <h1 className="font-title font-medium text-foreground-alt-100 text-2xl sm:text-3xl pt-2">{"Word Game"}</h1>
      <h2 className="font-body font-normal text-foreground-alt-100 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {"Like Wordle, but it's not!"}
      </h2>
    </>
  );
};

Home.PageTitle = PageTitle;

export default Home;
