import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile', () => {
    let addEventListenerMock;
    let removeEventListenerMock;

    beforeEach(() => {
        addEventListenerMock = jest.fn();
        removeEventListenerMock = jest.fn();

        window.matchMedia = jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: addEventListenerMock,
            removeEventListener: removeEventListenerMock,
            dispatchEvent: jest.fn(),
        }));

        // Reset innerWidth
        window.innerWidth = 1024;
    });

    it('should return false when window width is greater than breakpoint', () => {
        window.innerWidth = 1024;
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    it('should return true when window width is less than breakpoint', () => {
        window.innerWidth = 500;
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);
    });

    it('should update value on window resize (media query change)', () => {
        window.innerWidth = 1024;
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);

        // Simulate resize
        act(() => {
            window.innerWidth = 500;
            // Trigger the listener
            const onChange = addEventListenerMock.mock.calls[0][1];
            onChange();
        });

        expect(result.current).toBe(true);
    });

    it('should clean up event listener on unmount', () => {
        const { unmount } = renderHook(() => useIsMobile());
        unmount();
        expect(removeEventListenerMock).toHaveBeenCalled();
    });
});
