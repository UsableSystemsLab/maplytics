import React from 'react'
import { render } from '@testing-library/react'

// Inline leaflet mock to avoid circular require with moduleNameMapper
jest.mock('leaflet', () => ({
    map: jest.fn(() => ({
        setView: jest.fn().mockReturnThis(),
        addLayer: jest.fn(),
        remove: jest.fn(),
        panTo: jest.fn(),
        zoomIn: jest.fn(),
        zoomOut: jest.fn(),
        getZoom: jest.fn(() => 6),
        getCenter: jest.fn(() => ({ lat: 23.88, lng: 45.07 })),
        getPane: jest.fn(() => ({ style: {} })),
        fitBounds: jest.fn(),
        on: jest.fn(),
    })),
    tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
    polygon: jest.fn(() => ({
        addTo: jest.fn(),
        bindPopup: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
    })),
    geoJSON: jest.fn(() => ({ addTo: jest.fn(), clearLayers: jest.fn() })),
    layerGroup: jest.fn(() => ({
        addTo: jest.fn().mockReturnThis(),
        addLayer: jest.fn(),
        clearLayers: jest.fn(),
        getLayers: jest.fn(() => []),
    })),
    circleMarker: jest.fn(() => ({
        addTo: jest.fn(),
        bindPopup: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
    })),
    polyline: jest.fn(() => ({
        addTo: jest.fn(),
        bindPopup: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
    })),
    control: {
        zoom: jest.fn(() => ({ addTo: jest.fn() })),
        layers: jest.fn(() => ({ addTo: jest.fn() })),
    },
    Icon: {
        Default: {
            prototype: { _getIconUrl: jest.fn() },
            mergeOptions: jest.fn(),
        },
    },
}))

jest.mock('@/lib/districtColors', () => ({
    getDistrictColor: jest.fn(() => '#2C3580'),
}))

import BoundaryMap from '../BoundaryMap'

describe('BoundaryMap', () => {
    const defaultProps = {
        layers: [],
        primaryGeojson: null,
        className: 'boundary-map-test',
    }

    it('renders the map container div', () => {
        render(<BoundaryMap {...defaultProps} />)
        const container = document.querySelector('.boundary-map-test')
        expect(container).toBeInTheDocument()
    })

    it('renders with custom className', () => {
        render(<BoundaryMap {...defaultProps} className="custom-class" />)
        expect(document.querySelector('.custom-class')).toBeInTheDocument()
    })

    it('renders without crashing with GeoJSON layers', () => {
        const layers = [
            {
                id: 'layer1',
                name: 'Test Layer',
                geojson: {
                    type: 'FeatureCollection',
                    features: [],
                },
            },
        ]
        const { container } = render(<BoundaryMap layers={layers} />)
        expect(container.firstChild).toBeInTheDocument()
    })

    it('exposes imperative ref methods', () => {
        const ref = React.createRef()
        render(<BoundaryMap {...defaultProps} ref={ref} />)
        expect(ref.current).toBeDefined()
        expect(typeof ref.current.zoomIn).toBe('function')
        expect(typeof ref.current.zoomOut).toBe('function')
        expect(typeof ref.current.getCenter).toBe('function')
    })
})
