import WordGame from "features/wordGame";
import { FC } from "react";
import { StrykerPage } from "../types";
import { words } from "features/wordGame/fiveLetterWords";
import { useTranslation } from "react-i18next";

const answer = words[Math.floor(Math.random() * words.length)];

const Page: StrykerPage = () => {
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
  const { t } = useTranslation("translation");
  return (
    <>
      <h1 className="font-title font-medium text-foreground-alt-100 text-2xl sm:text-3xl pt-2">
        {t("wordGame.title")}
      </h1>
      <h2 className="font-body font-normal text-foreground-alt-100 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {t("wordGame.subtitle")}
      </h2>
    </>
  );
};

Page.PageTitle = PageTitle;

export default Page;
