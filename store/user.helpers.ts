import {cloneDeep} from "lodash";
import {iKanbanBoards} from "types";
import {UserData} from "./user";

export const baseTokenObject: Partial<UserData> = {
  kanbanData: {} as iKanbanBoards,
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
