import React from 'react'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from '../ProtectedRoute'

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}))

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}))

const { useAuth } = require('@/hooks/useAuth')

describe('ProtectedRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders children when user is authenticated', () => {
        useAuth.mockReturnValue({ user: { uid: '123' }, loading: false })
        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        )
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('shows loading indicator while auth is loading', () => {
        useAuth.mockReturnValue({ user: null, loading: true })
        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        )
        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders nothing when user is not authenticated', () => {
        useAuth.mockReturnValue({ user: null, loading: false })
        const { container } = render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        )
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
        expect(container).toBeEmptyDOMElement()
    })

    it('redirects to /login when user is not authenticated', () => {
        const mockPush = jest.fn()
        jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: mockPush })
        useAuth.mockReturnValue({ user: null, loading: false })
        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        )
        expect(mockPush).toHaveBeenCalledWith('/login')
    })
})
