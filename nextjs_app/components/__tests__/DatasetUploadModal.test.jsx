import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import DatasetUploadModal from '../DatasetUploadModal'

describe('DatasetUploadModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: jest.fn(),
        onSubmit: jest.fn(),
        fileName: 'test-file.geojson',
        defaultDatasetName: '',
        defaultEntityType: 'restaurant',
        isLoading: false,
        error: null,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders nothing when isOpen is false', () => {
        render(<DatasetUploadModal {...defaultProps} isOpen={false} />)
        expect(screen.queryByText('Upload Dataset')).not.toBeInTheDocument()
    })

    it('renders the modal when isOpen is true', () => {
        render(<DatasetUploadModal {...defaultProps} />)
        expect(screen.getAllByText('Upload Dataset').length).toBeGreaterThanOrEqual(1)
    })

    it('displays the file name in the header', () => {
        render(<DatasetUploadModal {...defaultProps} />)
        expect(screen.getByText('test-file.geojson')).toBeInTheDocument()
    })

    it('renders dataset name input', () => {
        render(<DatasetUploadModal {...defaultProps} />)
        expect(screen.getByPlaceholderText(/riyadh restaurants/i)).toBeInTheDocument()
    })

    it('pre-fills dataset name from defaultDatasetName', () => {
        render(<DatasetUploadModal {...defaultProps} defaultDatasetName="My Dataset" />)
        const input = screen.getByPlaceholderText(/riyadh restaurants/i)
        expect(input.value).toBe('My Dataset')
    })

    it('renders entity type select', () => {
        render(<DatasetUploadModal {...defaultProps} />)
        expect(screen.getByDisplayValue('Restaurant')).toBeInTheDocument()
    })

    it('renders all entity type options', () => {
        render(<DatasetUploadModal {...defaultProps} />)
        const select = document.querySelector('select')
        expect(select.options.length).toBe(6)
    })

    it('shows error message when error prop is set', () => {
        render(<DatasetUploadModal {...defaultProps} error="Upload failed" />)
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })

    it('calls onClose when Cancel button is clicked', () => {
        render(<DatasetUploadModal {...defaultProps} />)
        fireEvent.click(screen.getByText('Cancel'))
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop overlay is clicked', () => {
        render(<DatasetUploadModal {...defaultProps} />)
        const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50')
        fireEvent.click(overlay)
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onSubmit with form data when submitted', () => {
        render(<DatasetUploadModal {...defaultProps} defaultDatasetName="Test Dataset" />)
        fireEvent.click(screen.getByRole('button', { name: /upload dataset/i }))
        expect(defaultProps.onSubmit).toHaveBeenCalledWith('Test Dataset', 'restaurant', false)
    })

    it('does not submit when dataset name is empty', () => {
        render(<DatasetUploadModal {...defaultProps} />)
        const submitBtn = screen.getByRole('button', { name: /upload dataset/i })
        expect(submitBtn).toBeDisabled()
    })

    it('shows loading state when isLoading is true', () => {
        render(<DatasetUploadModal {...defaultProps} defaultDatasetName="Test" isLoading={true} />)
        expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })

    it('disables inputs when isLoading is true', () => {
        render(<DatasetUploadModal {...defaultProps} defaultDatasetName="Test" isLoading={true} />)
        const nameInput = screen.getByPlaceholderText(/riyadh restaurants/i)
        expect(nameInput).toBeDisabled()
    })
})
