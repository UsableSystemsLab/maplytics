import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import HeroSection from '../HeroSection'

// Inline leaflet mock to avoid circular require with moduleNameMapper
jest.mock('leaflet', () => ({
    map: jest.fn(() => ({
        setView: jest.fn().mockReturnThis(),
        addLayer: jest.fn(),
        remove: jest.fn(),
        on: jest.fn(),
        getPane: jest.fn(() => ({ style: {} })),
    })),
    tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
    polygon: jest.fn(() => ({ addTo: jest.fn(), bindPopup: jest.fn().mockReturnThis(), on: jest.fn() })),
    circleMarker: jest.fn(() => ({ addTo: jest.fn(), bindPopup: jest.fn().mockReturnThis(), on: jest.fn() })),
    layerGroup: jest.fn(() => ({ addTo: jest.fn().mockReturnThis(), clearLayers: jest.fn(), getLayers: jest.fn(() => []) })),
    geoJSON: jest.fn(() => ({ addTo: jest.fn(), clearLayers: jest.fn() })),
    control: { layers: jest.fn(() => ({ addTo: jest.fn() })) },
    marker: jest.fn(() => ({ addTo: jest.fn(), bindPopup: jest.fn() })),
}))

// Mock next-intl with rich text support
jest.mock('next-intl', () => ({
    useTranslations: () => {
        const t = (key) => key
        t.rich = (key, components) => {
            return <span data-testid={`rich-${key}`}>{key}</span>
        }
        return t
    },
}))

// Mock next/link
jest.mock('next/link', () => {
    return function MockLink({ href, children }) {
        return <a href={href}>{children}</a>
    }
})

describe('HeroSection', () => {
    it('renders without crashing', () => {
        render(<HeroSection />)
        expect(document.querySelector('section')).toBeInTheDocument()
    })

    it('renders the description text', () => {
        render(<HeroSection />)
        expect(screen.getByText('description')).toBeInTheDocument()
    })

    it('renders the "Try Now" button linking to /dashboard', () => {
        render(<HeroSection />)
        const link = document.querySelector('a[href="/dashboard"]')
        expect(link).toBeInTheDocument()
    })

    it('calls onScrollDown when explore more button is clicked', () => {
        const onScrollDown = jest.fn()
        render(<HeroSection onScrollDown={onScrollDown} />)
        const exploreBtn = screen.getByText('exploreMore')
        fireEvent.click(exploreBtn)
        expect(onScrollDown).toHaveBeenCalledTimes(1)
    })

    it('renders the scroll indicator button', () => {
        const onScrollDown = jest.fn()
        render(<HeroSection onScrollDown={onScrollDown} />)
        const scrollBtn = document.querySelector('.animate-bounce')
        expect(scrollBtn).toBeInTheDocument()
    })

    it('renders the scroll label text', () => {
        render(<HeroSection />)
        expect(screen.getByText('scroll')).toBeInTheDocument()
    })

    it('renders the try now text', () => {
        render(<HeroSection />)
        expect(screen.getByText('tryNow')).toBeInTheDocument()
    })
})
