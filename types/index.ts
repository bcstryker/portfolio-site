import {FC} from "react";

export interface StrykerPage extends FC {
  PageTitle: FC;
}

export type SetFunction = (property: any) => void;

export interface KanbanCard {
  id: string;
  content: string;
}

export interface KanbanCols {
  [uuid: string]: {
    name: string;
    items: KanbanCard[];
  };
}
