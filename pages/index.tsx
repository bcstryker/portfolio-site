import { FC } from "react";
import { useTranslation } from "react-i18next";
import { StrykerPage } from "../types";

const Page: StrykerPage = () => {
  const { t } = useTranslation("translation");
  return (
    <div className="h-full flex">
      <div className="justify-center border border-white bg-background-light p-8 mx-24 rounded-xl">
        <div className="flex justify-center">
          <h1 className="text-xl text-foreground-alt-100">{t("home.welcome")}</h1>
        </div>
        <div className="flex justify-center mt-12">
          <div>
            <h3 className="text-xl text-foreground-alt-100 whitespace-pre-wrap text-justify">
              {t("home.welcomeMessage")}
            </h3>
          </div>
        </div>
        <div className="flex justify-center mt-8">
          <a href="https://github.com/bcstryker/portfolio-site.git">
            <p className="text-accent hover:text-accent-light hover:underline">
              {t("home.repoLinkText")}
            </p>
          </a>
        </div>
      </div>
    </div>
  );
};

const PageTitle: FC = () => {
  const { t } = useTranslation("translation");
  return (
    <>
      <h1 className="font-title font-medium text-foreground-alt-100 text-2xl sm:text-3xl pt-2">
        {t("home.title")}
      </h1>
      <h2 className="font-body font-normal text-foreground-alt-100 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {t("home.subtitle")}
      </h2>
    </>
  );
};

Page.PageTitle = PageTitle;

export default Page;
