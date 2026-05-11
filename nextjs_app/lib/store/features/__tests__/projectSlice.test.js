import projectReducer, {
    setActiveProject,
    clearActiveProject,
    updateActiveProject,
    selectActiveProject
} from '../projectSlice';

describe('projectSlice', () => {
    const initialState = {
        activeProject: null,
    };

    it('should return the initial state', () => {
        expect(projectReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    describe('reducers', () => {
        it('should handle setActiveProject', () => {
            const project = { id: 'p1', name: 'Project 1' };
            const state = projectReducer(initialState, setActiveProject(project));
            expect(state.activeProject).toEqual(project);
        });

        it('should handle clearActiveProject', () => {
            let state = { activeProject: { id: 'p1', name: 'Project 1' } };
            state = projectReducer(state, clearActiveProject());
            expect(state.activeProject).toBeNull();
        });

        it('should handle updateActiveProject', () => {
            let state = { activeProject: { id: 'p1', name: 'Project 1', status: 'Draft' } };
            
            state = projectReducer(state, updateActiveProject({ status: 'Published' }));
            expect(state.activeProject).toEqual({ id: 'p1', name: 'Project 1', status: 'Published' });
            
            // Should do nothing if activeProject is null
            let nullState = projectReducer(initialState, updateActiveProject({ status: 'Published' }));
            expect(nullState.activeProject).toBeNull();
        });
    });

    describe('selectors', () => {
        it('should selectActiveProject', () => {
            const mockState = {
                project: {
                    activeProject: { id: 'p1', name: 'Project 1' }
                }
            };
            expect(selectActiveProject(mockState)).toEqual({ id: 'p1', name: 'Project 1' });
        });
    });
});
