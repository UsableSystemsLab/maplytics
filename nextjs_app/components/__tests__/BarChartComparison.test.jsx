import React from 'react'
import { render, screen } from '@testing-library/react'
import BarChartComparison from '../BarChartComparison'

// Mock vega-embed
jest.mock('vega-embed', () => ({
    __esModule: true,
    default: jest.fn(() =>
        Promise.resolve({ view: { finalize: jest.fn() } })
    ),
}))

describe('BarChartComparison', () => {
    it('shows "No data available" message when data is null', () => {
        render(<BarChartComparison data={null} />)
        expect(screen.getByText('No data available for chart')).toBeInTheDocument()
    })

    it('shows "No data available" message when data is empty array', () => {
        render(<BarChartComparison data={[]} />)
        expect(screen.getByText('No data available for chart')).toBeInTheDocument()
    })

    it('renders chart container when data is provided', () => {
        const data = [
            { category: 'Cat A', count: 10 },
            { category: 'Cat B', count: 5 },
        ]
        render(<BarChartComparison data={data} />)
        const container = document.querySelector('div[style]')
        expect(container).toBeInTheDocument()
    })

    it('renders chart container with correct min-height style', () => {
        const data = [
            { category: 'Cat A', count: 10 },
        ]
        render(<BarChartComparison data={data} />)
        const container = document.querySelector('div[style]')
        expect(container.style.minHeight).toBeTruthy()
    })
})
