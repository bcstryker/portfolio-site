import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from ".";

export interface UserData {
  kanbanData: any;
}

interface UserState {
  nonce: number;
  isFetching: boolean;
}

const initialState: UserState = {
  nonce: 0,
  isFetching: true,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<{account: string; data: UserData}>) => {
      const {account, data} = action.payload;
    },
    /**
     * This action allows us to merge in partial user token data. A good example of this
     * is when we perform a minimal user model refresh only for the active chain. This approach
     * protects us against losing state that doesn't exist on the current chain, e.g.
     * PICKLE balances.
     */
    setDillData: (state, action: PayloadAction<{account: string; data: Partial<any>}>) => {
      const {account, data} = action.payload;
      // const accountData = state.accounts[account];

      // if (!accountData) return;

      // state.accounts[account] = accountData;
    },

    setIsFetching: (state, action: PayloadAction<boolean>) => {
      state.isFetching = action.payload;
    },
    refresh: (state) => {
      state.nonce = state.nonce + 1;
    },
  },
});

const {refresh, setData, setIsFetching, setDillData} = userSlice.actions;
export const UserActions = {
  refresh,
  setData,
  setDillData,
  setIsFetching,
};

/**
 * Selectors
 */
const selectData = (state: RootState, account: string | null | undefined) => {
  if (!account) return;
  return state.user;
};

export const UserSelectors = {
  selectData,
};

export default userSlice.reducer;
