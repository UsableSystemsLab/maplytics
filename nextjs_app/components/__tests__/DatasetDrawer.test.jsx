import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeTestStore } from './testUtils'
import DatasetDrawer from '../DatasetDrawer'

jest.mock('next-intl', () => ({
    useTranslations: () => (key) => key,
}))

jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}))

jest.mock('@/lib/datasetApi', () => ({
    getDatasets: jest.fn(() => Promise.resolve({ datasets: [] })),
    searchDatasets: jest.fn(() => Promise.resolve({ datasets: [] })),
}))

// Mock UI drawer components
jest.mock('@/components/ui/drawer', () => ({
    Drawer: ({ open, children }) => open ? <div data-testid="drawer">{children}</div> : null,
    DrawerContent: ({ children }) => <div data-testid="drawer-content">{children}</div>,
    DrawerHeader: ({ children }) => <div>{children}</div>,
    DrawerTitle: ({ children }) => <h2>{children}</h2>,
    DrawerDescription: ({ children }) => <p>{children}</p>,
    DrawerFooter: ({ children }) => <div>{children}</div>,
    DrawerClose: ({ children }) => <div>{children}</div>,
}))

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children, value, onValueChange }) => <div data-testid="tabs">{children}</div>,
    TabsList: ({ children }) => <div>{children}</div>,
    TabsTrigger: ({ children, value, onClick }) => (
        <button onClick={onClick}>{children}</button>
    ),
}))

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, variant }) => (
        <button onClick={onClick} data-variant={variant}>{children}</button>
    ),
}))

const { useAuth } = require('@/hooks/useAuth')

describe('DatasetDrawer', () => {
    const defaultProps = {
        isOpen: true,
        onClose: jest.fn(),
        activeProject: null,
    }

    function renderWithStore(props = {}, initialState = {}) {
        const store = makeTestStore({
            layers: { selectedLayers: [], loadingLayerIds: [] },
            project: { activeProject: null },
            ...initialState,
        })
        return render(
            <Provider store={store}>
                <DatasetDrawer {...defaultProps} {...props} />
            </Provider>
        )
    }

    beforeEach(() => {
        jest.clearAllMocks()
        useAuth.mockReturnValue({ user: { uid: 'user1' }, loading: false })
    })

    it('renders the drawer when isOpen is true', () => {
        renderWithStore()
        expect(screen.getByTestId('drawer')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
        renderWithStore({ isOpen: false })
        expect(screen.queryByTestId('drawer')).not.toBeInTheDocument()
    })

    it('renders "Active Datasets" title', () => {
        renderWithStore()
        expect(screen.getByText('title')).toBeInTheDocument()
    })

    it('renders the search input', () => {
        renderWithStore()
        expect(screen.getByPlaceholderText('searchPlaceholder')).toBeInTheDocument()
    })

    it('renders My Library and Public Collections tabs', () => {
        renderWithStore()
        expect(screen.getByText('myLibrary')).toBeInTheDocument()
        expect(screen.getByText('publicCollections')).toBeInTheDocument()
    })

    it('renders the close button', () => {
        renderWithStore()
        expect(screen.getByText('close')).toBeInTheDocument()
    })

    it('updates search query when user types', () => {
        renderWithStore()
        const input = screen.getByPlaceholderText('searchPlaceholder')
        fireEvent.change(input, { target: { value: 'riyadh' } })
        expect(input.value).toBe('riyadh')
    })
})
