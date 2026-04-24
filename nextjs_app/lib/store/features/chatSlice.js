import { createSlice } from '@reduxjs/toolkit';

const DEFAULT_GREETING = {
  id: 1,
  role: 'bot',
  text: 'Hello! Open the Layers Browser, select a dataset, then ask me a question about it.',
};

const initialState = {
  messages: [DEFAULT_GREETING],
  isLoading: false,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    appendChatMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    resetChat: (state) => {
      state.messages = [DEFAULT_GREETING];
      state.isLoading = false;
    },
    setChatLoading: (state, action) => {
      state.isLoading = !!action.payload;
    },
  },
});

export const {
  appendChatMessage,
  resetChat,
  setChatLoading,
} = chatSlice.actions;
export const selectChatMessages = (state) => state.chat.messages;
export const selectChatIsLoading = (state) => state.chat.isLoading;
export default chatSlice.reducer;
