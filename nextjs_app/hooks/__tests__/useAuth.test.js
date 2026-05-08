import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { useAuthState } from 'react-firebase-hooks/auth';

jest.mock('react-firebase-hooks/auth', () => ({
    useAuthState: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
    auth: {},
}));

describe('useAuth', () => {
    it('should return user, loading, and error states from useAuthState', () => {
        const mockUser = { uid: '123' };
        useAuthState.mockReturnValue([mockUser, false, null]);

        const { result } = renderHook(() => useAuth());

        expect(result.current.user).toEqual(mockUser);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should handle loading state', () => {
        useAuthState.mockReturnValue([null, true, null]);

        const { result } = renderHook(() => useAuth());

        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('should handle error state', () => {
        const mockError = new Error('Auth error');
        useAuthState.mockReturnValue([null, false, mockError]);

        const { result } = renderHook(() => useAuth());

        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toEqual(mockError);
    });
});
