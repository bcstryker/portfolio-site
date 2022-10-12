import { FC, useEffect, useState } from "react";
import Kanban from "../features/Kanban";
import { KanbanCols, StrykerPage } from "../types";
import { useSelector } from "react-redux";
import { RootState } from "store";
import { useTranslation } from "react-i18next";

const Page: StrykerPage = () => {
  const { kanbanCols } = useSelector((state: RootState) => state.user);
  const [cols, setCols] = useState<KanbanCols>({} as KanbanCols);
  useEffect(() => setCols(kanbanCols), [kanbanCols]);
  return (
    <>
      <div className="block xl:flex mb-8 sm:mb-10">
        <div className="w-full flex justify-center">
          <Kanban cols={cols} setCols={setCols} />
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
        {t("kanban.title")}
      </h1>
      <h2 className="font-body font-normal text-foreground-alt-100 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {t("kanban.subtitle")}
      </h2>
    </>
  );
};

Page.PageTitle = PageTitle;

export default Page;
