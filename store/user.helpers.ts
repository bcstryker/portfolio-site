import {cloneDeep} from "lodash";
import {UserData} from "./user";
import {KanbanCols} from "../types";
import {v4 as uuid} from "uuid";

export const baseObject: Partial<UserData> = {
  kanbanCols: {
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

/**
 * A deep clone is important because if we dispatch data
 * passed to user model callbacks, Redux will make it
 * read-only, thus breaking the internals of UserModel.
 *
 */
export const normalizedData = (data: UserData): UserData => ({
  ...cloneDeep(data),
});
