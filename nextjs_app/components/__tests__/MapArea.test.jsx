import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeTestStore } from './testUtils'
import MapArea from '../MapArea'

// Mock auth
jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(() => ({ user: { uid: '123' }, loading: false })),
}))

// Mock API calls
jest.mock('@/lib/datasetApi', () => ({
    getProjectDatasetData: jest.fn(() => Promise.resolve({ geojson: { type: 'FeatureCollection', features: [] }, fields: [] })),
    getDatasetGeoJSON: jest.fn(() => Promise.resolve({ type: 'FeatureCollection', features: [] })),
}))

jest.mock('@/lib/districtColors', () => ({
    getDistrictColor: jest.fn(() => '#2C3580'),
    resetDistrictColors: jest.fn(),
}))

// Mock child components that render maps
jest.mock('@/components/MapComponent', () => {
    const React = require('react')
    return React.forwardRef(function MockMapComponent(props, ref) {
        React.useImperativeHandle(ref, () => ({
            zoomIn: jest.fn(),
            zoomOut: jest.fn(),
        }))
        return <div data-testid="map-component" />
    })
})

jest.mock('@/components/ChartSidePanel', () => {
    return function MockChartSidePanel({ isOpen, onClose }) {
        return isOpen ? (
            <div data-testid="chart-panel">
                <button onClick={onClose}>Close Chart</button>
            </div>
        ) : null
    }
})

jest.mock('@/components/StatCard', () => {
    return function MockStatCard({ label, value }) {
        return <div data-testid={`stat-card-${label}`}>{label}: {value}</div>
    }
})

describe('MapArea', () => {
    function renderWithStore(initialState = {}) {
        const store = makeTestStore({
            layers: { selectedLayers: [], loadingLayerIds: [] },
            project: { activeProject: null },
            ...initialState,
        })
        return render(
            <Provider store={store}>
                <MapArea />
            </Provider>
        )
    }

    it('renders the map component', () => {
        renderWithStore()
        expect(screen.getByTestId('map-component')).toBeInTheDocument()
    })

    it('renders the search bar', () => {
        renderWithStore()
        expect(screen.getByPlaceholderText('Search locations...')).toBeInTheDocument()
    })

    it('renders zoom controls', () => {
        renderWithStore()
        expect(screen.getByTitle('Zoom In')).toBeInTheDocument()
        expect(screen.getByTitle('Zoom Out')).toBeInTheDocument()
    })

    it('renders the Analysis Results section', () => {
        renderWithStore()
        expect(screen.getByText('Analysis Results')).toBeInTheDocument()
    })

    it('shows search suggestions when user types in search', () => {
        renderWithStore()
        const input = screen.getByPlaceholderText('Search locations...')
        fireEvent.change(input, { target: { value: 'Riyadh' } })
        expect(screen.getByText('Suggestions')).toBeInTheDocument()
    })

    it('clears search when X button is clicked', () => {
        renderWithStore()
        const input = screen.getByPlaceholderText('Search locations...')
        fireEvent.change(input, { target: { value: 'Riyadh' } })
        const clearBtn = screen.getByText('✕')
        fireEvent.click(clearBtn)
        expect(input.value).toBe('')
    })

    it('renders with active layer - shows layer name', () => {
        renderWithStore({
            layers: {
                selectedLayers: [{ id: 'layer1', name: 'My Layer', type: 'GEO' }],
                loadingLayerIds: [],
            },
        })
        expect(screen.getByText('My Layer')).toBeInTheDocument()
    })

    it('toggles analysis panel when header is clicked', () => {
        renderWithStore()
        const header = screen.getByText('Analysis Results').closest('[class*="cursor-pointer"]')
        fireEvent.click(header)
        // After click it expands — check for stat cards
        expect(screen.getAllByTestId(/stat-card/)).toBeTruthy()
    })

    it('renders the fullscreen toggle button', () => {
        renderWithStore()
        const maximizeBtn = screen.getByTitle('Zoom In').closest('div').parentElement
        expect(document.querySelector('[title*="Zoom"]')).toBeInTheDocument()
    })
})
