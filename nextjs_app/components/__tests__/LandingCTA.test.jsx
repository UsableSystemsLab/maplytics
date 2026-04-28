import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import LandingCTA from '../LandingCTA'

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

// Mock UI components
jest.mock('./ui/button', () => ({
    Button: ({ children, onClick, variant, className }) => (
        <button onClick={onClick} data-variant={variant} className={className}>
            {children}
        </button>
    ),
}), { virtual: true })

describe('LandingCTA', () => {
    it('renders without crashing', () => {
        render(<LandingCTA />)
        expect(document.querySelector('section')).toBeInTheDocument()
    })

    it('renders the CTA heading', () => {
        render(<LandingCTA />)
        // The translated key "cta" should appear
        expect(screen.getAllByText('cta').length).toBeGreaterThan(0)
    })

    it('renders the title key', () => {
        render(<LandingCTA />)
        expect(screen.getByText('title')).toBeInTheDocument()
    })

    it('renders the description', () => {
        render(<LandingCTA />)
        expect(screen.getByText('description')).toBeInTheDocument()
    })

    it('renders a link to /auth/login for primary button', () => {
        render(<LandingCTA />)
        const loginLinks = document.querySelectorAll('a[href="/auth/login"]')
        expect(loginLinks.length).toBeGreaterThan(0)
    })

    it('renders a link to /datasets for secondary button', () => {
        render(<LandingCTA />)
        const datasetsLinks = document.querySelectorAll('a[href="/datasets"]')
        expect(datasetsLinks.length).toBeGreaterThan(0)
    })
})
