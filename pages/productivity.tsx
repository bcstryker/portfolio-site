import {FC, useState} from "react";
import Kanban from "../features/productivity/Kanban";
import {StrykerPage} from "../types";
import {uuid} from "uuidv4";

const Home: StrykerPage = () => {
  const [cols, setCols] = useState(colsFromBackend);
  return (
    <>
      <div className="block xl:flex mb-8 sm:mb-10">
        <div className="w-full flex justify-center">
          <h1 className="text-xl text-foreground-alt-100">Welcome!</h1>
          <Kanban cols={cols} />
        </div>
      </div>
    </>
  );
};

const itemsFromBackend: item[] = [
  {id: uuid(), content: "First Task."},
  {id: uuid(), content: "Second Task."},
];

const colsFromBackend: kanbanCols = {
  [uuid()]: {
    name: "Todo",
    items: itemsFromBackend,
  },
};

interface item {
  id: String;
  content: String;
}

export interface kanbanCols {
  [uuid: string]: {
    name: string;
    items: item[];
  };
}

const PageTitle: FC = () => {
  return (
    <>
      <h1 className="font-title font-medium text-foreground-alt-100 text-2xl sm:text-3xl pt-2">{"Kanban Board"}</h1>
      <h2 className="font-body font-normal text-foreground-alt-100 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {"A great tool to increase productivity!"}
      </h2>
    </>
  );
};

Home.PageTitle = PageTitle;

export default Home;
