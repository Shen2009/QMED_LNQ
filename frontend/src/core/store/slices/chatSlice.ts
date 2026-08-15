import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    setChatLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setChatError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearChat: state => {
      state.messages = [];
      state.error = null;
    },
  },
});

export const {addMessage, setChatLoading, setChatError, clearChat} =
  chatSlice.actions;

export default chatSlice.reducer;
