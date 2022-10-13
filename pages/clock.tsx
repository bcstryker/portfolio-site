import type { StrykerPage } from "../types";
import { FC } from "react";
import { useTranslation } from "react-i18next";

const Page: StrykerPage = () => {
  return (
    <div className="w-full flex justify-center items-center">
      <div className="bg-background-light w-4/5 lg:w-1/2 max-w-xl rounded-xl border border-foreground-alt-500 shadow p-6 md:p-12">
        <p>{"STUB"}</p>
      </div>
    </div>
  );
};

const PageTitle: FC = () => {
  const { t } = useTranslation("translation");
  return (
    <>
      <h1 className="font-title font-medium text-2xl sm:text-3xl pt-2">{t("clock.title")}</h1>
      <h2 className="font-body font-normal text-foreground-alt-200 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {t("clock.subtitle")}
      </h2>
    </>
  );
};

Page.PageTitle = PageTitle;

export default Page;
