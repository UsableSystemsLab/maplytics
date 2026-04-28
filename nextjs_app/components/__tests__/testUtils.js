// Test helpers: create a minimal Redux store for testing with pre-populated state
import { configureStore } from '@reduxjs/toolkit';
import layersReducer from '@/lib/store/features/layersSlice';
import projectReducer from '@/lib/store/features/projectSlice';

/**
 * Creates a test Redux store.
 * @param {object} preloadedState - optional initial state slice overrides
 */
export function makeTestStore(preloadedState = {}) {
    return configureStore({
        reducer: {
            layers: layersReducer,
            project: projectReducer,
        },
        preloadedState,
    });
}
