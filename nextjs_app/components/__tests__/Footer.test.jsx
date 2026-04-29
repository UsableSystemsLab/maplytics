import React from 'react'
import { render, screen } from '@testing-library/react'
import Footer from '../Footer'

// Mock next-intl
jest.mock('next-intl', () => ({
    useTranslations: () => (key) => key,
}))

// Mock next/link
jest.mock('next/link', () => {
    return function MockLink({ href, children }) {
        return <a href={href}>{children}</a>
    }
})

describe('Footer', () => {
    it('renders without crashing', () => {
        render(<Footer />)
        expect(document.querySelector('footer')).toBeInTheDocument()
    })

    it('renders translated keys for about section', () => {
        render(<Footer />)
        expect(screen.getByText('aboutTitle')).toBeInTheDocument()
    })

    it('renders quick links', () => {
        render(<Footer />)
        expect(screen.getByText('quickLinks')).toBeInTheDocument()
        expect(screen.getByText('datasets')).toBeInTheDocument()
        expect(screen.getByText('privacyPolicy')).toBeInTheDocument()
        expect(screen.getByText('termsOfService')).toBeInTheDocument()
    })

    it('renders get started section', () => {
        render(<Footer />)
        expect(screen.getByText('getStarted')).toBeInTheDocument()
        expect(screen.getByText('startNow')).toBeInTheDocument()
        expect(screen.getByText('login')).toBeInTheDocument()
    })

    it('renders copyright text with current year', () => {
        render(<Footer />)
        const year = new Date().getFullYear().toString()
        expect(screen.getByText(/copyright/)).toBeInTheDocument()
        expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
    })
})
