import { render, screen } from '@testing-library/react';
import StoreProvider from '../StoreProvider';

jest.mock('redux-persist/lib/storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
}));

describe('StoreProvider', () => {
    it('should render children wrapped in Redux Provider and PersistGate', () => {
        render(
            <StoreProvider>
                <div data-testid="child-component">Hello Redux</div>
            </StoreProvider>
        );

        expect(screen.getByTestId('child-component')).toBeInTheDocument();
        expect(screen.getByText('Hello Redux')).toBeInTheDocument();
    });
});
