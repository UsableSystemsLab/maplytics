import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PublicDatasetBrowser from '../PublicDatasetBrowser'

// Mocks
jest.mock('next-intl', () => ({
    useTranslations: () => (key, opts) => {
        if (key === 'items') return `${opts?.count} items`
        return key
    },
}))

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}))

jest.mock('@/lib/datasetApi', () => ({
    getDatasets: jest.fn(() => Promise.resolve({ datasets: [] })),
    searchDatasets: jest.fn(() => Promise.resolve({ datasets: [] })),
    getDatasetGeoJSON: jest.fn(() => Promise.resolve({ type: 'FeatureCollection', features: [] })),
}))

jest.mock('@/lib/projectApi', () => ({
    getProjects: jest.fn(() => Promise.resolve([])),
}))

jest.mock('@/lib/uploadApi', () => ({
    uploadFile: jest.fn(() => Promise.resolve()),
}))

const { useAuth } = require('@/hooks/useAuth')

describe('PublicDatasetBrowser', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        useAuth.mockReturnValue({ user: { uid: '123', email: 'test@test.com', displayName: 'Test User' }, loading: false })
    })

    it('renders the search input', async () => {
        render(<PublicDatasetBrowser />)
        await waitFor(() => {
            expect(screen.getByPlaceholderText('searchPlaceholder')).toBeInTheDocument()
        })
    })

    it('renders the Add Dataset button', async () => {
        render(<PublicDatasetBrowser />)
        await waitFor(() => {
            expect(screen.getByText('addDataset')).toBeInTheDocument()
        })
    })

    it('shows empty state when no datasets are returned', async () => {
        render(<PublicDatasetBrowser />)
        await waitFor(() => {
            expect(screen.getByText('noDatasetsFound')).toBeInTheDocument()
        })
    })

    it('shows error message when fetch fails', async () => {
        const { getDatasets } = require('@/lib/datasetApi')
        getDatasets.mockRejectedValueOnce(new Error('Network error'))

        render(<PublicDatasetBrowser />)
        await waitFor(() => {
            expect(screen.getByText('error')).toBeInTheDocument()
            expect(screen.getByText('tryAgain')).toBeInTheDocument()
        })
    })

    it('shows datasets when returned by API', async () => {
        const { getDatasets } = require('@/lib/datasetApi')
        getDatasets.mockResolvedValueOnce({
            datasets: [
                {
                    id: 'pub1',
                    name: 'Public Layer A',
                    description: 'A public dataset',
                    feature_count: 50,
                    geometry_type: 'Polygon',
                    last_updated: '2024-01-01T00:00:00Z',
                    is_verified: false,
                    is_public: true,
                },
            ],
        })

        render(<PublicDatasetBrowser />)
        await waitFor(() => {
            expect(screen.getByText('Public Layer A')).toBeInTheDocument()
        })
    })

    it('shows verified badge for verified datasets', async () => {
        const { getDatasets } = require('@/lib/datasetApi')
        getDatasets.mockResolvedValueOnce({
            datasets: [
                {
                    id: 'pub2',
                    name: 'Verified Dataset',
                    is_verified: true,
                    is_public: true,
                    feature_count: 30,
                    geometry_type: 'Point',
                },
            ],
        })

        render(<PublicDatasetBrowser />)
        await waitFor(() => {
            expect(screen.getByText('verified')).toBeInTheDocument()
        })
    })

    it('opens the Add Dataset modal when button is clicked', async () => {
        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getByText('addDataset'))
        fireEvent.click(screen.getByText('addDataset'))
        expect(screen.getByText('addNewTitle')).toBeInTheDocument()
    })

    it('redirects to login when unauthenticated user clicks Add Dataset', async () => {
        const mockPush = jest.fn()
        jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: mockPush })
        useAuth.mockReturnValue({ user: null, loading: false })

        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getByText('addDataset'))
        fireEvent.click(screen.getByText('addDataset'))
        expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('updates search query when user types', async () => {
        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getByPlaceholderText('searchPlaceholder'))
        const input = screen.getByPlaceholderText('searchPlaceholder')
        fireEvent.change(input, { target: { value: 'riyadh' } })
        expect(input.value).toBe('riyadh')
    })

    it('shows dataset preview when preview button is clicked', async () => {
        const { getDatasets } = require('@/lib/datasetApi')
        getDatasets.mockResolvedValueOnce({
            datasets: [
                {
                    id: 'pub3',
                    name: 'Preview Dataset',
                    is_public: true,
                    feature_count: 10,
                    geometry_type: 'Point',
                },
            ],
        })

        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getAllByText('Preview Dataset'))
        fireEvent.click(screen.getByText('preview'))
        // Preview modal should open with title
        expect(screen.getAllByText('Preview Dataset').length).toBeGreaterThan(0)
    })

    it('handles file selection and validation', async () => {
        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getByText('addDataset'))
        fireEvent.click(screen.getByText('addDataset'))

        const file = new File(['{}'], 'public.json', { type: 'application/json' })
        const input = document.getElementById('file-upload')
        
        fireEvent.change(input, { target: { files: [file] } })
        expect(screen.getByText('public.json')).toBeInTheDocument()
    })

    it('rejects invalid file formats in add modal', async () => {
        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getByText('addDataset'))
        fireEvent.click(screen.getByText('addDataset'))

        const file = new File(['foo'], 'test.txt', { type: 'text/plain' })
        const input = document.getElementById('file-upload')
        
        fireEvent.change(input, { target: { files: [file] } })
        expect(screen.getByText('validation.invalidFormat')).toBeInTheDocument()
    })

    it('handles drag and drop for public upload', async () => {
        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getByText('addDataset'))
        fireEvent.click(screen.getByText('addDataset'))

        const dropzone = screen.getByText('dragDrop').closest('div')
        
        fireEvent.dragOver(dropzone)
        fireEvent.dragLeave(dropzone)
        
        const file = new File(['{}'], 'dragged_pub.geojson', { type: 'application/json' })
        fireEvent.drop(dropzone, {
            dataTransfer: { files: [file] }
        })
        
        expect(screen.getByText('dragged_pub.geojson')).toBeInTheDocument()
    })

    it('handles successful public file upload', async () => {
        const { uploadFile } = require('@/lib/uploadApi')
        uploadFile.mockResolvedValueOnce({})

        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getByText('addDataset'))
        fireEvent.click(screen.getByText('addDataset'))

        fireEvent.change(screen.getByPlaceholderText('namePlaceholder'), { target: { value: 'Public Dataset' } })
        fireEvent.change(document.getElementById('file-upload'), { target: { files: [new File(['{}'], 'pub_upload.json')] } })

        fireEvent.submit(screen.getByText('uploadAction').closest('form'))
        
        await waitFor(() => {
            expect(screen.getByText('uploadSuccess')).toBeInTheDocument()
        })
    })

    it('handles preview modal error state', async () => {
        const { getDatasets, getDatasetGeoJSON } = require('@/lib/datasetApi')
        getDatasets.mockResolvedValueOnce({
            datasets: [{ id: 'pub_err', name: 'Error Preview Pub', is_public: true }],
        })
        getDatasetGeoJSON.mockRejectedValueOnce(new Error('Preview fail'))

        render(<PublicDatasetBrowser />)
        await waitFor(() => screen.getAllByText('Error Preview Pub'))
        fireEvent.click(screen.getByText('preview'))

        await waitFor(() => {
            expect(screen.getByText('Error loading preview data.')).toBeInTheDocument()
        })
    })
});
