import {FC} from "react";

export interface StrykerPage extends FC {
  PageTitle: FC;
}

export type SetFunction = (property: any) => void;
