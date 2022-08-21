import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {KanbanCard, KanbanCols} from "types";
import {RootState} from ".";
import {v4 as uuid} from "uuid";
import {DraggableLocation} from "react-beautiful-dnd";

export interface UserData {
  kanbanCols: KanbanCols;
}

export interface UserState {
  kanbanCols: KanbanCols;
}

const initialState: UserState = {
  kanbanCols: {
    //} as KanbanCols,
    [uuid()]: {
      name: "Backlog",
      items: [],
    },
    [uuid()]: {
      name: "Ready",
      items: [],
    },
    [uuid()]: {
      name: "In Progress",
      items: [],
    },
    [uuid()]: {
      name: "Done",
      items: [],
    },
  } as KanbanCols,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setKanban: (state, action: PayloadAction<{colId: string; kanbanData: KanbanCols}>) => {
      const {kanbanCols} = action.payload.kanbanData;
      const tmp = state.kanbanCols;
      tmp.items = {...tmp.items, items: kanbanCols.items};
    },
    addCard: (state, action: PayloadAction<{colId: string; newCard: KanbanCard}>) => {
      const {colId, newCard} = action.payload;
      const tmp = state.kanbanCols;
      tmp[colId].items.push(newCard);
    },
    moveCard: (
      state,
      action: PayloadAction<{cols: KanbanCols; source: DraggableLocation; destination: DraggableLocation}>
    ) => {
      const {cols, source, destination} = action.payload;
      const tmp = state.kanbanCols;
      const sourceCol = cols[source.droppableId];
      const destCol = cols[destination.droppableId];
      const sourceItems = [...sourceCol.items];
      const destItems = [...destCol.items];
      const [removed] = sourceItems.splice(destination.index, 1);
      destItems.splice(destination.index, 0, removed);
      tmp[source.droppableId].items = sourceItems;
      tmp[destination.droppableId].items = destItems;
    },
  },
});

const {setKanban, addCard, moveCard} = userSlice.actions;
export const UserActions = {
  setKanban,
  addCard,
  moveCard,
};

/**
 * Selectors
 */

const selectKanban = (state: RootState) => {
  return state.user.kanbanCols;
};

export const UserSelectors = {
  selectKanban,
};

export default userSlice.reducer;
