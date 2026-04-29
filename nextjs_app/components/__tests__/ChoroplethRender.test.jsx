import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ChoroplethRender from '../ChoroplethRender'

// Mock all API calls
jest.mock('@/lib/geoApi', () => ({
    getRegionBoundaries: jest.fn(() => Promise.resolve({ type: 'FeatureCollection', features: [] })),
    getCityBoundaries: jest.fn(() => Promise.resolve({ type: 'FeatureCollection', features: [] })),
    getChoroplethData: jest.fn(() =>
        Promise.resolve({
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: { name_en: 'Riyadh', count: 50 }, geometry: null },
            ],
        })
    ),
}))

jest.mock('@/lib/aggregateData', () => ({
    pointInGeometry: jest.fn(() => false),
}))

jest.mock('@/lib/choroplethScale', () => ({
    COLOR_SCHEMES: { Blues: ['#f7fbff', '#084594'], Greens: ['#f7fcf5', '#00441b'] },
    createChoroplethScale: jest.fn(() => ({
        getQuantizedColor: jest.fn(() => '#084594'),
    })),
    getLegendEntries: jest.fn(() => [
        { color: '#084594', rangeLabel: '1–100' },
    ]),
    getColorRange: jest.fn(() => ['#f7fbff', '#c7dcef', '#084594']),
}))

describe('ChoroplethRender', () => {
    const panelSlotRef = { current: document.createElement('div') }

    beforeEach(() => {
        document.body.appendChild(panelSlotRef.current)
    })

    afterEach(() => {
        document.body.removeChild(panelSlotRef.current)
    })

    const defaultProps = {
        displayGeojson: null,
        mapCenter: [24.7, 46.7],
        zoomLevel: 6,
        view: null,
        panelSlotRef,
        onReady: jest.fn(),
    }

    it('renders nothing when panelSlotRef has no current', () => {
        const { container } = render(
            <ChoroplethRender {...defaultProps} panelSlotRef={{ current: null }} />
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('renders Choropleth Settings heading in portal', () => {
        render(<ChoroplethRender {...defaultProps} />)
        expect(screen.getByText('Choropleth Settings')).toBeInTheDocument()
    })

    it('renders Boundary Level buttons when view is not locked', () => {
        render(<ChoroplethRender {...defaultProps} />)
        expect(screen.getByText('auto')).toBeInTheDocument()
        expect(screen.getByText('regions')).toBeInTheDocument()
        expect(screen.getByText('cities')).toBeInTheDocument()
        expect(screen.getByText('districts')).toBeInTheDocument()
    })

    it('does not render Boundary Level buttons when view is locked', () => {
        render(<ChoroplethRender {...defaultProps} view="regions" />)
        expect(screen.queryByText('auto')).not.toBeInTheDocument()
    })

    it('changes boundary lock when a level button is clicked', async () => {
        render(<ChoroplethRender {...defaultProps} />)
        await act(async () => {
            fireEvent.click(screen.getByText('regions'))
        })
        const regionsBtn = screen.getByText('regions')
        expect(regionsBtn.className).toMatch(/bg-primary/)
    })

    it('renders color scheme buttons', () => {
        render(<ChoroplethRender {...defaultProps} />)
        expect(screen.getByText('Blues')).toBeInTheDocument()
        expect(screen.getByText('Greens')).toBeInTheDocument()
    })

    it('shows the current boundary level label', () => {
        render(<ChoroplethRender {...defaultProps} zoomLevel={6} />)
        expect(screen.getByText('Regions')).toBeInTheDocument()
    })

    it('calls onReady when component mounts', () => {
        const onReady = jest.fn()
        render(<ChoroplethRender {...defaultProps} onReady={onReady} />)
        expect(onReady).toHaveBeenCalled()
    })
})
