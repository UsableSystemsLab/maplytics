import React from 'react'
import { render, screen } from '@testing-library/react'
import AuthMapBackground from '../AuthMapBackground'

// Inline leaflet mock (avoid circular require with moduleNameMapper)
jest.mock('leaflet', () => ({
    map: jest.fn(() => ({
        setView: jest.fn().mockReturnThis(),
        addLayer: jest.fn(),
        remove: jest.fn(),
        panTo: jest.fn(),
        on: jest.fn(),
        getPane: jest.fn(() => ({ style: {} })),
        fitBounds: jest.fn(),
    })),
    tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
    polygon: jest.fn(() => ({ addTo: jest.fn() })),
    geoJSON: jest.fn(() => ({ addTo: jest.fn(), clearLayers: jest.fn() })),
    control: { layers: jest.fn(() => ({ addTo: jest.fn() })) },
    icon: jest.fn(() => ({})),
    marker: jest.fn(() => ({ addTo: jest.fn(), bindPopup: jest.fn() })),
    featureGroup: jest.fn(() => ({ addTo: jest.fn(), getBounds: jest.fn(() => ({})) })),
}))

describe('AuthMapBackground', () => {
    it('renders children content', () => {
        render(
            <AuthMapBackground>
                <div data-testid="child-content">Login Form</div>
            </AuthMapBackground>
        )
        expect(screen.getByTestId('child-content')).toBeInTheDocument()
        expect(screen.getByText('Login Form')).toBeInTheDocument()
    })

    it('renders the MAPLYTICS branding text', () => {
        render(<AuthMapBackground><div /></AuthMapBackground>)
        expect(screen.getByText('MAPLYTICS')).toBeInTheDocument()
    })

    it('renders the tagline', () => {
        render(<AuthMapBackground><div /></AuthMapBackground>)
        expect(screen.getByText('Spatial Analysis Simplified')).toBeInTheDocument()
    })

    it('renders the map container div', () => {
        render(<AuthMapBackground><div /></AuthMapBackground>)
        const mapContainer = document.querySelector('.auth-map-bg')
        expect(mapContainer).toBeInTheDocument()
    })

    it('renders the dark overlay', () => {
        render(<AuthMapBackground><div /></AuthMapBackground>)
        const overlay = document.querySelector('.bg-black\\/40')
        expect(overlay).toBeInTheDocument()
    })
})
