import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ChartSidePanel from '../ChartSidePanel'

// Mock the useChartData hook
jest.mock('@/hooks/useChartData', () => ({
    useChartData: jest.fn(),
    isBlocker: jest.fn(),
}))

// Mock BarChartComparison
jest.mock('@/components/BarChartComparison', () => {
    return function MockBarChart({ data }) {
        return <div data-testid="bar-chart">Chart with {data.length} items</div>
    }
})

const { useChartData, isBlocker } = require('@/hooks/useChartData')

const defaultChartHookReturn = {
    categoricalFields: [{ name: 'category' }],
    selectedField: 'category',
    setSelectedField: jest.fn(),
    chartData: [
        { category: 'A', count: 5 },
        { category: 'B', count: 3 },
    ],
    diagnostics: { status: 'ok', pointCount: 2, nonPointCount: 0 },
}

describe('ChartSidePanel', () => {
    const defaultProps = {
        features: [{ geometry: { type: 'Point' }, properties: { category: 'A' } }],
        fieldsMetadata: [{ name: 'category', type: 'string' }],
        isOpen: true,
        onClose: jest.fn(),
    }

    beforeEach(() => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        isBlocker.mockReturnValue(false)
        jest.clearAllMocks()
    })

    it('renders the panel header', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        isBlocker.mockReturnValue(false)
        render(<ChartSidePanel {...defaultProps} />)
        expect(screen.getByText('Bar Chart Comparison')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        isBlocker.mockReturnValue(false)
        render(<ChartSidePanel {...defaultProps} />)
        const closeBtn = screen.getByRole('button')
        fireEvent.click(closeBtn)
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('renders the BarChartComparison when data is OK', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        isBlocker.mockReturnValue(false)
        render(<ChartSidePanel {...defaultProps} />)
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('renders blocker message when status is a blocker', () => {
        useChartData.mockReturnValue({
            ...defaultChartHookReturn,
            diagnostics: { status: 'no_data', pointCount: 0, nonPointCount: 0 },
            chartData: [],
        })
        isBlocker.mockReturnValue(true)
        render(<ChartSidePanel {...defaultProps} />)
        expect(screen.getByText('No data available for chart analysis.')).toBeInTheDocument()
    })

    it('renders blocker message for no_points status', () => {
        useChartData.mockReturnValue({
            ...defaultChartHookReturn,
            diagnostics: { status: 'no_points', pointCount: 0, nonPointCount: 2 },
            chartData: [],
        })
        isBlocker.mockReturnValue(true)
        render(<ChartSidePanel {...defaultProps} />)
        expect(screen.getByText(/polygon\/line features/i)).toBeInTheDocument()
    })

    it('renders warning banner when status is single_value', () => {
        useChartData.mockReturnValue({
            ...defaultChartHookReturn,
            diagnostics: { status: 'single_value', pointCount: 5, nonPointCount: 0 },
        })
        isBlocker.mockReturnValue(false)
        render(<ChartSidePanel {...defaultProps} />)
        expect(screen.getByText(/same value/i)).toBeInTheDocument()
    })

    it('shows field selector with categoricalFields', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        isBlocker.mockReturnValue(false)
        render(<ChartSidePanel {...defaultProps} />)
        expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('is translated off-screen when isOpen is false', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        isBlocker.mockReturnValue(false)
        render(<ChartSidePanel {...defaultProps} isOpen={false} />)
        const panel = document.querySelector('.translate-x-full')
        expect(panel).toBeInTheDocument()
    })
})
