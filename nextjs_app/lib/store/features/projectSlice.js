import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeProject: null,
};

export const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setActiveProject: (state, action) => {
      state.activeProject = action.payload;
    },
    clearActiveProject: (state) => {
      state.activeProject = null;
    },
    updateActiveProject: (state, action) => {
      if (state.activeProject) {
        state.activeProject = { ...state.activeProject, ...action.payload };
      }
    },
  },
});

export const { setActiveProject, clearActiveProject, updateActiveProject } = projectSlice.actions;

export const selectActiveProject = (state) => state.project.activeProject;

export default projectSlice.reducer;
