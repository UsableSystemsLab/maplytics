import React from 'react'
import { render, screen } from '@testing-library/react'
import ChoroplethMap from '../ChoroplethMap'

// Mock vega-embed
jest.mock('vega-embed', () => ({
    __esModule: true,
    default: jest.fn(() =>
        Promise.resolve({
            view: {
                finalize: jest.fn(),
                addEventListener: jest.fn(),
            },
        })
    ),
}))

// Mock choroplethScale
jest.mock('@/lib/choroplethScale', () => ({
    getColorRange: jest.fn(() => ['#f7fbff', '#deebf7', '#084594']),
}))

describe('ChoroplethMap', () => {
    const mockBoundaries = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: { name_en: 'Riyadh', name: 'Riyadh' },
                geometry: { type: 'Polygon', coordinates: [[[45, 24], [46, 24], [46, 25], [45, 25], [45, 24]]] },
            },
        ],
    }

    const mockData = [{ name: 'Riyadh', count: 100 }]

    it('renders "No boundary data available" when boundaries is null', () => {
        render(<ChoroplethMap boundaries={null} data={[]} />)
        expect(screen.getByText('No boundary data available')).toBeInTheDocument()
    })

    it('renders "No boundary data available" when boundaries has no features', () => {
        render(<ChoroplethMap boundaries={{ features: [] }} data={[]} />)
        expect(screen.getByText('No boundary data available')).toBeInTheDocument()
    })

    it('renders chart container when boundaries are provided', () => {
        const { container } = render(
            <ChoroplethMap boundaries={mockBoundaries} data={mockData} />
        )
        // The container div for vega-embed should be present (no "No boundary" message)
        expect(screen.queryByText('No boundary data available')).not.toBeInTheDocument()
        expect(container.firstChild).toBeInTheDocument()
    })

    it('applies className to the container', () => {
        render(
            <ChoroplethMap boundaries={mockBoundaries} data={mockData} className="my-choropleth" />
        )
        expect(document.querySelector('.my-choropleth')).toBeInTheDocument()
    })

    it('shows the empty state with custom width/height', () => {
        render(
            <ChoroplethMap boundaries={null} data={[]} width={800} height={600} />
        )
        const emptyEl = screen.getByText('No boundary data available')
        expect(emptyEl.style.width).toBe('800px')
        expect(emptyEl.style.height).toBe('600px')
    })
})
