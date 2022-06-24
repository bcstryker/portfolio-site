import {configureStore} from "@reduxjs/toolkit";
import {TypedUseSelectorHook, useDispatch, useSelector} from "react-redux";
import {listenerMiddleware} from "./listenerMiddleware";

import themeReducer from "./theme";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

export const useAppDispatch = () => useDispatch<typeof store.dispatch>();
export type AppDispatch = ReturnType<typeof useAppDispatch>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
