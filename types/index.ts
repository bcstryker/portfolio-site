import {FC} from "react";

export interface StrykerPage extends FC {
  PageTitle: FC;
}

export type SetFunction = (property: any) => void;

// PRODUCTIVITY
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

// WORD GAME
export interface iGame {
  guesses: iGuess[];
}

export interface iGuess {
  word: iLetter[];
}

export interface iLetter {
  letter: string;
  inWord: boolean;
  inPosition: boolean;
}
