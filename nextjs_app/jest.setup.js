import '@testing-library/jest-dom'

// Polyfill ResizeObserver for JSDOM (used by AnalysisFlipCard and similar)
global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
        this.callback = callback
    }
    observe() {}
    unobserve() {}
    disconnect() {}
}

// Polyfill scrollIntoView (used by Chat component)
window.HTMLElement.prototype.scrollIntoView = jest.fn()

// Polyfill fetch (needed by Firebase in AppSidebar/DatasetDrawer)
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
    })
)

// Mock matchMedia for components that use responsive hooks
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
})

// Suppress specific console output in tests to reduce noise
const originalError = console.error
beforeAll(() => {
    console.error = (...args) => {
        // Suppress React act() warnings and prop-type errors
        if (
            typeof args[0] === 'string' &&
            (args[0].includes('Warning: ReactDOM.render') ||
                args[0].includes('act(') ||
                args[0].includes('prop types') ||
                args[0].includes('Failed to fetch'))
        ) {
            return
        }
        originalError(...args)
    }
})

afterAll(() => {
    console.error = originalError
})
