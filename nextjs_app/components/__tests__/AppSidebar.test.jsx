import React from 'react'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeTestStore } from './testUtils'

// Mock firebase modules BEFORE any imports that trigger them
jest.mock('@/lib/firebase', () => ({ auth: {} }))
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }))
jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(() => ({})),
    signOut: jest.fn(() => Promise.resolve()),
}))
jest.mock('react-firebase-hooks/auth', () => ({
    useAuthState: jest.fn(() => [null, false, null]),
}))

// Mock all heavy dependencies
jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}))

jest.mock('next/navigation', () => ({
    usePathname: () => '/en/dashboard',
    useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('next/link', () => {
    return function MockLink({ href, children }) {
        return <a href={href}>{children}</a>
    }
})

jest.mock('@/lib/projectApi', () => ({
    getProjects: jest.fn(() => Promise.resolve([])),
    deleteProject: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/lib/datasetApi', () => ({
    getDatasets: jest.fn(() => Promise.resolve({ datasets: [] })),
    getDatasetGeoJSON: jest.fn(() => Promise.resolve({ type: 'FeatureCollection', features: [] })),
}))

jest.mock('@/lib/apiClient', () => ({
    apiGet: jest.fn(() => Promise.resolve({})),
    apiPost: jest.fn(() => Promise.resolve({})),
    apiDelete: jest.fn(() => Promise.resolve({})),
}))

jest.mock('@/components/ui/sidebar', () => ({
    Sidebar: ({ children }) => <nav data-testid="sidebar">{children}</nav>,
    SidebarContent: ({ children }) => <div>{children}</div>,
    SidebarFooter: ({ children }) => <div>{children}</div>,
    SidebarGroup: ({ children, className }) => <div className={className}>{children}</div>,
    SidebarGroupContent: ({ children }) => <div>{children}</div>,
    SidebarGroupLabel: ({ children }) => <div>{children}</div>,
    SidebarHeader: ({ children, className }) => <div className={className}>{children}</div>,
    SidebarMenu: ({ children }) => <ul>{children}</ul>,
    SidebarMenuButton: ({ children, onClick, disabled, isActive, asChild, tooltip }) => {
        if (asChild) return React.Children.only(children)
        return <button onClick={onClick} disabled={disabled}>{children}</button>
    },
    SidebarMenuItem: ({ children, className }) => <li className={className}>{children}</li>,
    SidebarMenuAction: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    SidebarTrigger: ({ className }) => <button className={className}>Toggle</button>,
    useSidebar: () => ({ isMobile: false, state: 'expanded' }),
}))

jest.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }) => <div>{children}</div>,
    DropdownMenuItem: ({ children }) => <div>{children}</div>,
    DropdownMenuLabel: ({ children }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuShortcut: ({ children }) => <span>{children}</span>,
    DropdownMenuTrigger: ({ children }) => <div>{children}</div>,
}))

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, size, className }) => (
        <button onClick={onClick} className={className}>{children}</button>
    ),
}))

// Mock DatasetDrawer since it imports firebase chain
jest.mock('../DatasetDrawer', () => {
    return function MockDatasetDrawer({ isOpen }) {
        return isOpen ? <div data-testid="dataset-drawer">Drawer</div> : null
    }
})

import { AppSidebar } from '../app-sidebar'
const { useAuth } = require('@/hooks/useAuth')

describe('AppSidebar', () => {
    function renderWithStore(initialState = {}) {
        const store = makeTestStore({
            layers: { selectedLayers: [], loadingLayerIds: [] },
            project: { activeProject: null },
            ...initialState,
        })
        return render(
            <Provider store={store}>
                <AppSidebar />
            </Provider>
        )
    }

    beforeEach(() => {
        jest.clearAllMocks()
        useAuth.mockReturnValue({ user: { uid: '123', email: 'test@test.com', displayName: 'Test User' }, loading: false })
    })

    it('renders the sidebar', () => {
        renderWithStore()
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })

    it('renders main navigation items', () => {
        renderWithStore()
        expect(screen.getByText('Projects')).toBeInTheDocument()
        expect(screen.getByText('Overview')).toBeInTheDocument()
        expect(screen.getByText('Map view')).toBeInTheDocument()
        expect(screen.getByText('Comparison')).toBeInTheDocument()
    })

    it('renders workspace navigation items', () => {
        renderWithStore()
        expect(screen.getByText('Datasets')).toBeInTheDocument()
        expect(screen.getByText('AI Chat')).toBeInTheDocument()
    })

    it('renders Tools section', () => {
        renderWithStore()
        expect(screen.getByText('Layers Browser')).toBeInTheDocument()
    })

    it('renders General section links', () => {
        renderWithStore()
        expect(screen.getByText('Home')).toBeInTheDocument()
        expect(screen.getByText('Account')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('renders user display name in footer when logged in', () => {
        renderWithStore()
        expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('renders user email in footer', () => {
        renderWithStore()
        expect(screen.getByText('test@test.com')).toBeInTheDocument()
    })

    it('renders login button when user is not authenticated', () => {
        useAuth.mockReturnValue({ user: null, loading: false })
        renderWithStore()
        expect(screen.getByText('Login')).toBeInTheDocument()
    })

    it('shows "No Project Selected" when no active project', () => {
        renderWithStore()
        expect(screen.getByText('No Project Selected')).toBeInTheDocument()
    })

    it('shows active project name when project is selected', () => {
        renderWithStore({
            project: { activeProject: { id: '1', name: 'My Project' } },
        })
        expect(screen.getByText('My Project')).toBeInTheDocument()
    })

    it('renders "No layers active on map" when no layers selected', () => {
        renderWithStore()
        expect(screen.getByText('No layers active on map')).toBeInTheDocument()
    })

    it('renders active layer names when layers are selected', () => {
        renderWithStore({
            layers: {
                selectedLayers: [
                    { id: '1', name: 'Riyadh Layer', type: 'GEO' },
                ],
                loadingLayerIds: [],
            },
        })
        expect(screen.getByText('Riyadh Layer')).toBeInTheDocument()
    })
})
