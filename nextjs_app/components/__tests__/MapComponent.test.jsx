import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock leaflet fully
jest.mock('leaflet', () => require('../../__mocks__/leaflet'))
jest.mock('leaflet/dist/leaflet.css', () => {})

// Mock BoundaryMap and ChoroplethRender since they create actual maps
jest.mock('@/components/BoundaryMap', () => {
    const React = require('react')
    return React.forwardRef(function MockBoundaryMap(props, ref) {
        React.useImperativeHandle(ref, () => ({
            zoomIn: jest.fn(),
            zoomOut: jest.fn(),
            getCenter: jest.fn(),
        }))
        return <div data-testid="boundary-map" className={props.className} />
    })
})

jest.mock('@/components/ChoroplethRender', () => {
    return function MockChoroplethRender({ onReady }) {
        return <div data-testid="choropleth-render" />
    }
})

import MapComponent from '../MapComponent'

describe('MapComponent', () => {
    const defaultProps = {
        type: null,
        view: null,
        displayGeojson: null,
        allLayers: [],
        categoryField: null,
        onZoomChange: jest.fn(),
        onMoveEnd: jest.fn(),
    }

    it('renders without crashing', () => {
        render(<MapComponent {...defaultProps} />)
        expect(screen.getByTestId('boundary-map')).toBeInTheDocument()
    })

    it('renders BoundaryMap by default', () => {
        render(<MapComponent {...defaultProps} />)
        expect(screen.getByTestId('boundary-map')).toBeInTheDocument()
    })

    it('renders ChoroplethRender when type is "choropleth"', () => {
        render(<MapComponent {...defaultProps} type="choropleth" />)
        expect(screen.getByTestId('choropleth-render')).toBeInTheDocument()
    })

    it('does not render ChoroplethRender when type is null', () => {
        render(<MapComponent {...defaultProps} type={null} />)
        expect(screen.queryByTestId('choropleth-render')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
        render(<MapComponent {...defaultProps} className="my-map" />)
        const container = document.querySelector('.my-map')
        expect(container).toBeInTheDocument()
    })

    it('exposes imperative handle via ref', () => {
        const ref = React.createRef()
        render(<MapComponent {...defaultProps} ref={ref} />)
        expect(ref.current).toBeDefined()
        expect(typeof ref.current.zoomIn).toBe('function')
        expect(typeof ref.current.zoomOut).toBe('function')
        expect(typeof ref.current.getCenter).toBe('function')
    })
})
