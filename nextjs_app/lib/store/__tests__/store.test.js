import { store, persistor } from '../store';

// Mock storage for redux-persist so it doesn't crash in JSDOM
jest.mock('redux-persist/lib/storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
}));

describe('Redux Store Config', () => {
    it('should configure the store with correct reducers and persistence', () => {
        expect(store).toBeDefined();
        expect(persistor).toBeDefined();

        const state = store.getState();

        // Ensure both slices are present in the root reducer
        expect(state).toHaveProperty('project');
        expect(state).toHaveProperty('layers');
        expect(state).toHaveProperty('_persist'); // Redux persist metadata
    });
});
