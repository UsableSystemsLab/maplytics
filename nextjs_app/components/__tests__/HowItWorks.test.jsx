import React from 'react'
import { render, screen } from '@testing-library/react'
import HowItWorks from '../HowItWorks'

// Mock next-intl
const mockSteps = [
    { number: '01', title: 'Upload Data', description: 'Upload your dataset' },
    { number: '02', title: 'Chat with AI', description: 'Get AI insights' },
    { number: '03', title: 'Dashboard', description: 'View your analytics' },
]

jest.mock('next-intl', () => ({
    useTranslations: () => {
        const t = (key) => key
        t.raw = (key) => mockSteps
        return t
    },
}))

describe('HowItWorks', () => {
    it('renders without crashing', () => {
        render(<HowItWorks />)
        expect(document.querySelector('section')).toBeInTheDocument()
    })

    it('renders the title key', () => {
        render(<HowItWorks />)
        expect(screen.getByText('title')).toBeInTheDocument()
    })

    it('renders step titles from translated steps', () => {
        render(<HowItWorks />)
        expect(screen.getByText('Upload Data')).toBeInTheDocument()
        expect(screen.getByText('Chat with AI')).toBeInTheDocument()
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders step numbers', () => {
        render(<HowItWorks />)
        expect(screen.getByText('01')).toBeInTheDocument()
        expect(screen.getByText('02')).toBeInTheDocument()
        expect(screen.getByText('03')).toBeInTheDocument()
    })

    it('renders step descriptions', () => {
        render(<HowItWorks />)
        expect(screen.getByText('Upload your dataset')).toBeInTheDocument()
        expect(screen.getByText('Get AI insights')).toBeInTheDocument()
    })

    it('renders 3 step cards', () => {
        render(<HowItWorks />)
        const cards = document.querySelectorAll('.rounded-3xl')
        expect(cards.length).toBe(3)
    })
})
