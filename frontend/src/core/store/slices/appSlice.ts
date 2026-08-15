import {createSlice} from '@reduxjs/toolkit';

interface AppState {
  onboardingDone: boolean;
  languageSelectDone: boolean;
}

const initialState: AppState = {
  onboardingDone: false,
  languageSelectDone: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnboardingDone(state) {
      state.onboardingDone = true;
    },
    setLanguageSelectDone(state) {
      state.languageSelectDone = true;
    },
  },
});

export const {setOnboardingDone, setLanguageSelectDone} = appSlice.actions;
export default appSlice.reducer;
