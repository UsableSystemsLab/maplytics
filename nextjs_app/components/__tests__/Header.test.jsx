import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../Header'

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

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
    usePathname: () => '/en/dashboard',
}))

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}))

// Mock firebase
jest.mock('@/lib/firebase', () => ({ auth: {} }))
jest.mock('firebase/auth', () => ({
    signOut: jest.fn(() => Promise.resolve()),
}))

// Mock LanguageSwitcher
jest.mock('../LanguageSwitcher', () => {
    return function MockLanguageSwitcher() {
        return <button>Language</button>
    }
})

const { useAuth } = require('@/hooks/useAuth')

describe('Header', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders the Maplytics logo link', () => {
        useAuth.mockReturnValue({ user: null, loading: false })
        render(<Header />)
        expect(screen.getAllByText('Maplytics')[0]).toBeInTheDocument()
    })

    it('renders login link when user is not authenticated', () => {
        useAuth.mockReturnValue({ user: null, loading: false })
        render(<Header />)
        expect(screen.getAllByText('signIn')[0]).toBeInTheDocument()
    })

    it('renders logout button when user is authenticated', () => {
        useAuth.mockReturnValue({ user: { email: 'test@test.com' }, loading: false })
        render(<Header />)
        expect(screen.getAllByText('logout')[0]).toBeInTheDocument()
    })

    it('does not render auth buttons while loading', () => {
        useAuth.mockReturnValue({ user: null, loading: true })
        render(<Header />)
        expect(screen.queryByText('signIn')).not.toBeInTheDocument()
        expect(screen.queryByText('logout')).not.toBeInTheDocument()
    })

    it('opens mobile menu when menu button is clicked', () => {
        useAuth.mockReturnValue({ user: null, loading: false })
        render(<Header />)
        const menuBtn = screen.getByLabelText('Toggle menu')
        fireEvent.click(menuBtn)
        expect(screen.getByText('menu')).toBeInTheDocument()
    })

    it('renders with dark variant class', () => {
        useAuth.mockReturnValue({ user: null, loading: false })
        render(<Header variant="dark" />)
        const header = document.querySelector('header')
        expect(header.className).toMatch(/bg-transparent/)
    })

    it('renders with light variant class (default)', () => {
        useAuth.mockReturnValue({ user: null, loading: false })
        render(<Header />)
        const header = document.querySelector('header')
        expect(header.className).toMatch(/bg-white/)
    })
})
