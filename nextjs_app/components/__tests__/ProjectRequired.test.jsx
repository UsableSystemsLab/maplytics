import React from 'react'
import { render, screen } from '@testing-library/react'
import ProjectRequired from '../ProjectRequired'

jest.mock('next-intl', () => ({
    useTranslations: () => (key) => key,
}))

// Mock next/link
jest.mock('next/link', () => {
    return function MockLink({ href, children, className }) {
        return <a href={href} className={className}>{children}</a>
    }
})

// Mock lucide-react
jest.mock('lucide-react', () => ({
    AlertCircle: () => <svg data-testid="alert-circle-icon" />,
    ArrowRight: () => <svg data-testid="arrow-right-icon" />,
}))

// Mock the alert component
jest.mock('@/components/ui/alert', () => ({
    Alert: ({ children, variant, className }) => (
        <div data-testid="alert" data-variant={variant} className={className}>{children}</div>
    ),
    AlertTitle: ({ children }) => <h2 data-testid="alert-title">{children}</h2>,
    AlertDescription: ({ children }) => <div data-testid="alert-description">{children}</div>,
}))

describe('ProjectRequired', () => {
    it('renders the alert component', () => {
        render(<ProjectRequired />)
        expect(screen.getByTestId('alert')).toBeInTheDocument()
    })

    it('renders the "Project Required" title', () => {
        render(<ProjectRequired />)
        expect(screen.getByText('title')).toBeInTheDocument()
    })

    it('renders description text', () => {
        render(<ProjectRequired />)
        expect(screen.getByText('description')).toBeInTheDocument()
    })

    it('renders a link to /dashboard/projects', () => {
        render(<ProjectRequired />)
        const link = screen.getByRole('link', { name: /goToProjects/i })
        expect(link).toHaveAttribute('href', '/dashboard/projects')
    })
})
