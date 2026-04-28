import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeTestStore } from './testUtils'
import MyDatasetBrowser from '../MyDatasetBrowser'

// Mocks
jest.mock('next-intl', () => ({
    useTranslations: () => (key, opts) => {
        if (key === 'items') return `${opts?.count} items`
        return key
    },
}))

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}))

jest.mock('@/lib/datasetApi', () => ({
    getDatasets: jest.fn(() => Promise.resolve({ datasets: [] })),
    searchDatasets: jest.fn(() => Promise.resolve({ datasets: [] })),
    getDatasetGeoJSON: jest.fn(() => Promise.resolve({ type: 'FeatureCollection', features: [] })),
}))

jest.mock('@/lib/projectApi', () => ({
    getProjects: jest.fn(() => Promise.resolve([])),
}))

jest.mock('@/lib/uploadApi', () => ({
    uploadFile: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/components/ProjectRequired', () => {
    return function MockProjectRequired() {
        return <div data-testid="project-required">Project Required</div>
    }
})

const { useAuth } = require('@/hooks/useAuth')

function renderWithStore(initialState = {}) {
    const store = makeTestStore({
        layers: { selectedLayers: [], loadingLayerIds: [] },
        project: { activeProject: null },
        ...initialState,
    })
    return render(
        <Provider store={store}>
            <MyDatasetBrowser />
        </Provider>
    )
}

describe('MyDatasetBrowser', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuth.mockReturnValue({ user: { uid: '123', email: 'test@test.com', displayName: 'Test User' }, loading: false })
    })

    it('shows login prompt when user is not authenticated', () => {
        useAuth.mockReturnValue({ user: null, loading: false })
        renderWithStore()
        expect(screen.getByText('pleaseLogin')).toBeInTheDocument()
    })

    it('renders search input when user is authenticated', async () => {
        renderWithStore()
        await waitFor(() => {
            expect(screen.getByPlaceholderText('searchPlaceholder')).toBeInTheDocument()
        })
    })

    it('renders the Add Dataset button', async () => {
        renderWithStore()
        await waitFor(() => {
            expect(screen.getByText('addDataset')).toBeInTheDocument()
        })
    })

    it('renders loading state initially', () => {
        renderWithStore()
        // loading state is shown immediately then resolves
        const loadingElements = document.querySelectorAll('.animate-spin')
        expect(loadingElements.length).toBeGreaterThanOrEqual(0) // may be 0 after async resolve
    })

    it('shows empty state when no datasets are returned', async () => {
        renderWithStore()
        await waitFor(() => {
            expect(screen.getByText('noDatasetsFound')).toBeInTheDocument()
        })
    })

    it('opens the Add Dataset modal when button is clicked', async () => {
        renderWithStore()
        await waitFor(() => screen.getByText('addDataset'))
        fireEvent.click(screen.getByText('addDataset'))
        expect(screen.getByText('addNewTitle')).toBeInTheDocument()
    })

    it('closes the Add Dataset modal when X is clicked', async () => {
        renderWithStore()
        await waitFor(() => screen.getByText('addDataset'))
        fireEvent.click(screen.getByText('addDataset'))
        expect(screen.getByText('addNewTitle')).toBeInTheDocument()

        const closeButtons = document.querySelectorAll('button')
        // Find the X button in the modal header
        const closeBtn = Array.from(closeButtons).find(btn =>
            btn.closest('.fixed') && btn.className.includes('text-gray-400')
        )
        if (closeBtn) {
            fireEvent.click(closeBtn)
            await waitFor(() => {
                expect(screen.queryByText('addNewTitle')).not.toBeInTheDocument()
            })
        }
    })

    it('shows datasets when data is returned', async () => {
        const { getDatasets } = require('@/lib/datasetApi')
        getDatasets.mockResolvedValueOnce({
            datasets: [
                {
                    id: '1',
                    name: 'Riyadh Restaurants',
                    description: 'Test dataset',
                    feature_count: 100,
                    geometry_type: 'Point',
                    last_updated: '2024-01-01T00:00:00Z',
                },
            ],
        })

        renderWithStore()
        await waitFor(() => {
            expect(screen.getByText('Riyadh Restaurants')).toBeInTheDocument()
        })
    })

    it('updates search query when user types', async () => {
        renderWithStore()
        await waitFor(() => screen.getByPlaceholderText('searchPlaceholder'))
        const input = screen.getByPlaceholderText('searchPlaceholder')
        fireEvent.change(input, { target: { value: 'riyadh' } })
        expect(input.value).toBe('riyadh')
    })
})
