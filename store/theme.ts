import {PayloadAction, createSlice} from "@reduxjs/toolkit";
import {startAppListening} from "./listenerMiddleware";

import {RootState} from ".";
import {applyTheme, currentTheme} from "../features/theme/themes";

export enum ThemeType {
  Light = "light",
  Dark = "dark",
}

export interface CurrentTheme {
  label: string;
  value: string;
}

export interface ThemeState {
  type: ThemeType;
  current: CurrentTheme;
}

const initialState: ThemeState = {
  type: ThemeType.Dark,
  current: {label: "Dark", value: "dark"},
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setThemeType: (state, action: PayloadAction<ThemeType>) => {
      state.type = action.payload;
    },
    setCurrentTheme: (state, action: PayloadAction<CurrentTheme>) => {
      state.current = action.payload;
    },
  },
});

/**
 * Actions
 */
export const {setThemeType, setCurrentTheme} = themeSlice.actions;
export const ThemeActions = {
  setThemeType,
  setCurrentTheme,
};

/**
 * Selectors
 */
const selectTheme = (state: RootState) => state.theme;
const selectThemeTone = (state: RootState) => currentTheme(state.theme).tone;

/**
 * Listeners
 */
startAppListening({
  actionCreator: setThemeType,
  effect: (_, listenerApi) => applyTheme(listenerApi.getState().theme),
});

startAppListening({
  actionCreator: setCurrentTheme,
  effect: (_, listenerApi) => applyTheme(listenerApi.getState().theme),
});

export const ThemeSelectors = {
  selectTheme,
  selectThemeTone,
};

export default themeSlice.reducer;
