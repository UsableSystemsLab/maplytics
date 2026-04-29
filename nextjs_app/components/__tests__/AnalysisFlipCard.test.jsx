import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AnalysisFlipCard from '../AnalysisFlipCard'

// Mock useChartData hook
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
        { category: 'Restaurant', count: 45 },
        { category: 'Shop', count: 20 },
    ],
    diagnostics: { status: 'ok', pointCount: 5, nonPointCount: 0 },
}

const mockFeatures = [
    { type: 'Feature', geometry: { type: 'Point' }, properties: { category: 'Restaurant' } },
    { type: 'Feature', geometry: { type: 'Point' }, properties: { category: 'Shop' } },
]

describe('AnalysisFlipCard', () => {
    beforeEach(() => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        isBlocker.mockReturnValue(false)
        jest.clearAllMocks()
    })

    it('renders empty state when features is null', () => {
        useChartData.mockReturnValue({ ...defaultChartHookReturn, chartData: [] })
        render(<AnalysisFlipCard features={null} />)
        expect(screen.getByText('No Dataset Loaded')).toBeInTheDocument()
    })

    it('renders empty state when features array is empty', () => {
        useChartData.mockReturnValue({ ...defaultChartHookReturn, chartData: [] })
        render(<AnalysisFlipCard features={[]} />)
        expect(screen.getByText('No Dataset Loaded')).toBeInTheDocument()
    })

    it('renders the "Quick Analysis Summary" header when data is loaded', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        render(<AnalysisFlipCard features={mockFeatures} />)
        expect(screen.getAllByText('Quick Analysis Summary').length).toBeGreaterThan(0)
    })

    it('renders dataset name', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        render(<AnalysisFlipCard features={mockFeatures} datasetName="Riyadh Restaurants" />)
        expect(screen.getByText('Riyadh Restaurants')).toBeInTheDocument()
    })

    it('renders the feature count', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        render(<AnalysisFlipCard features={mockFeatures} featureCount={100} />)
        expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('renders the Categories stat card', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        render(<AnalysisFlipCard features={mockFeatures} />)
        expect(screen.getByText('Categories')).toBeInTheDocument()
        // 1 categorical field
        expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('renders the Top Field with top category', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        render(<AnalysisFlipCard features={mockFeatures} />)
        expect(screen.getByText('Top Field')).toBeInTheDocument()
        expect(screen.getByText('Restaurant')).toBeInTheDocument()
        expect(screen.getByText('45 occurrences')).toBeInTheDocument()
    })

    it('calls onClose when X button is clicked in empty state', () => {
        useChartData.mockReturnValue({ ...defaultChartHookReturn, chartData: [] })
        const onClose = jest.fn()
        render(<AnalysisFlipCard features={null} onClose={onClose} />)
        const closeBtn = document.querySelector('button[class*="text-white"]')
        fireEvent.click(closeBtn)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('renders the "Show Bar Chart" button when data is loaded', () => {
        useChartData.mockReturnValue(defaultChartHookReturn)
        render(<AnalysisFlipCard features={mockFeatures} />)
        expect(screen.getByText('Show Bar Chart')).toBeInTheDocument()
    })

    it('disables "Show Bar Chart" button when status is a blocker', () => {
        useChartData.mockReturnValue({
            ...defaultChartHookReturn,
            diagnostics: { status: 'no_points', pointCount: 0, nonPointCount: 5 },
        })
        isBlocker.mockReturnValue(true)
        render(<AnalysisFlipCard features={mockFeatures} />)
        const btn = screen.getByText('Show Bar Chart').closest('button')
        expect(btn).toBeDisabled()
    })

    it('renders "Load data to analyze" button in empty state', () => {
        useChartData.mockReturnValue({ ...defaultChartHookReturn, chartData: [] })
        render(<AnalysisFlipCard features={[]} />)
        expect(screen.getByText('Load data to analyze')).toBeInTheDocument()
    })
})
