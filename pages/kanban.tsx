import { FC, useEffect, useState } from "react";
import Kanban from "../features/Kanban";
import { KanbanCols, StrykerPage } from "../types";
import { useSelector } from "react-redux";
import { RootState } from "store";

const Home: StrykerPage = () => {
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
  return (
    <>
      <h1 className="font-title font-medium text-foreground-alt-100 text-2xl sm:text-3xl pt-2">
        {"Kanban Board"}
      </h1>
      <h2 className="font-body font-normal text-foreground-alt-100 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {"A great tool to increase productivity!"}
      </h2>
    </>
  );
};

Home.PageTitle = PageTitle;

export default Home;
