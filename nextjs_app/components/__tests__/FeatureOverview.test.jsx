import React from 'react'
import { render, screen } from '@testing-library/react'
import FeatureOverview from '../FeatureOverview'

// Mock next-intl
const mockCards = [
    { tag: 'Data', title: 'Upload & Manage', description: 'Manage your datasets', bullets: ['GeoJSON', 'CSV'] },
    { tag: 'AI', title: 'AI Analysis', description: 'Get AI-powered insights', bullets: ['Smart filters'] },
    { tag: 'Viz', title: 'Visualization', description: 'Beautiful maps', bullets: ['Choropleth'] },
]

jest.mock('next-intl', () => ({
    useTranslations: () => {
        const t = (key) => key
        t.raw = (key) => mockCards
        return t
    },
}))

describe('FeatureOverview', () => {
    it('renders without crashing', () => {
        render(<FeatureOverview />)
        expect(document.querySelector('section')).toBeInTheDocument()
    })

    it('renders the badge', () => {
        render(<FeatureOverview />)
        expect(screen.getByText('badge')).toBeInTheDocument()
    })

    it('renders feature card titles', () => {
        render(<FeatureOverview />)
        expect(screen.getByText('Upload & Manage')).toBeInTheDocument()
        expect(screen.getByText('AI Analysis')).toBeInTheDocument()
        expect(screen.getByText('Visualization')).toBeInTheDocument()
    })

    it('renders feature card tags', () => {
        render(<FeatureOverview />)
        expect(screen.getByText('Data')).toBeInTheDocument()
        expect(screen.getByText('AI')).toBeInTheDocument()
        expect(screen.getByText('Viz')).toBeInTheDocument()
    })

    it('renders feature card descriptions', () => {
        render(<FeatureOverview />)
        expect(screen.getByText('Manage your datasets')).toBeInTheDocument()
    })

    it('renders bullet points', () => {
        render(<FeatureOverview />)
        expect(screen.getByText('GeoJSON')).toBeInTheDocument()
        expect(screen.getByText('CSV')).toBeInTheDocument()
    })

    it('renders the Maplytics large heading', () => {
        render(<FeatureOverview />)
        expect(screen.getByText('maplytics')).toBeInTheDocument()
    })

    it('accepts a ref via forwardRef', () => {
        const ref = React.createRef()
        render(<FeatureOverview ref={ref} />)
        expect(ref.current).not.toBeNull()
        expect(ref.current.tagName).toBe('SECTION')
    })
})
