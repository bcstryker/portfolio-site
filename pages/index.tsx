import {FC} from "react";
import {useTranslation} from "react-i18next";
import {StrykerPage} from "../types";

const Home: StrykerPage = () => {
  const {t} = useTranslation("translation");
  return (
    <>
      <div className="w-full flex justify-center mb-16 mt-48">
        <h1 className="text-xl text-foreground-alt-100">{t("home.welcome")}</h1>
      </div>
      <div className="w-full flex justify-center mt-16">
        <div className="w-2/3">
          <h3 className="text-xl text-foreground-alt-100 whitespace-pre-wrap text-justify">
            {t("home.welcomeMessage")}
          </h3>
        </div>
      </div>
      <div className="w-full flex justify-center mt-16">
        <div className="w-2/3">
          <h4 className="text-xl text-foreground-alt-100 whitespace-pre-wrap text-justify">{t("home.devNotes")}</h4>
        </div>
      </div>
      <div className="w-full flex justify-center mt-16">
        <a href="https://github.com/bcstryker/portfolio-site.git">
          <p className="text-accent hover:text-accent-light hover:underline">{"Portfolio Site GitHub Repo"}</p>
        </a>
      </div>
    </>
  );
};

const PageTitle: FC = () => {
  return (
    <>
      <h1 className="font-title font-medium text-foreground-alt-100 text-2xl sm:text-3xl pt-2">{"Home Page"}</h1>
      <h2 className="font-body font-normal text-foreground-alt-100 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {"Welcome to this website!"}
      </h2>
    </>
  );
};

Home.PageTitle = PageTitle;

export default Home;
