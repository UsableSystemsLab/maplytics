import React from 'react'
import { render } from '@testing-library/react'

// Mock leaflet before import
jest.mock('leaflet', () => {
    const L = {
        map: jest.fn(() => ({
            setView: jest.fn().mockReturnThis(),
            addLayer: jest.fn(),
            remove: jest.fn(),
            panTo: jest.fn(),
            fitBounds: jest.fn(),
            on: jest.fn(),
        })),
        tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
        polygon: jest.fn(() => ({ addTo: jest.fn(), bindPopup: jest.fn().mockReturnThis() })),
        geoJSON: jest.fn(() => ({
            addTo: jest.fn(),
            getBounds: jest.fn(() => ({ isValid: jest.fn(() => false) })),
            remove: jest.fn(),
        })),
        layerGroup: jest.fn(() => ({
            addTo: jest.fn().mockReturnThis(),
            addLayer: jest.fn(),
            clearLayers: jest.fn(),
            remove: jest.fn(),
        })),
        marker: jest.fn(() => ({
            addTo: jest.fn().mockReturnThis(),
            bindPopup: jest.fn().mockReturnThis(),
        })),
        circleMarker: jest.fn(() => ({
            addTo: jest.fn().mockReturnThis(),
            bindPopup: jest.fn().mockReturnThis(),
        })),
        Icon: {
            Default: {
                prototype: { _getIconUrl: jest.fn() },
                mergeOptions: jest.fn(),
            },
        },
    }
    return L
})
jest.mock('leaflet/dist/leaflet.css', () => {})

import ComparisonMap from '../ComparisonMap'

describe('ComparisonMap', () => {
    const defaultProps = {
        mapId: 'test-map',
        center: [24.7, 46.7],
        zoom: 12,
        markers: [],
    }

    it('renders the map container div with correct id', () => {
        render(<ComparisonMap {...defaultProps} />)
        expect(document.getElementById('test-map')).toBeInTheDocument()
    })

    it('renders the map container with the correct className', () => {
        render(<ComparisonMap {...defaultProps} />)
        const container = document.getElementById('test-map')
        expect(container.className).toMatch(/w-full/)
    })

    it('renders without crashing with markers', () => {
        const markers = [
            { position: [24.7, 46.7], title: 'Location A' },
        ]
        const { container } = render(<ComparisonMap {...defaultProps} markers={markers} />)
        expect(container.firstChild).toBeInTheDocument()
    })

    it('renders without crashing with boundary GeoJSON', () => {
        const boundary = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [] },
            properties: {},
        }
        const { container } = render(<ComparisonMap {...defaultProps} boundaryGeoJSON={boundary} />)
        expect(container.firstChild).toBeInTheDocument()
    })

    it('renders without crashing with feature points', () => {
        const featurePoints = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: { type: 'Point', coordinates: [46.7, 24.7] }, properties: { name: 'Test' } },
            ],
        }
        const { container } = render(<ComparisonMap {...defaultProps} featurePoints={featurePoints} />)
        expect(container.firstChild).toBeInTheDocument()
    })
})
