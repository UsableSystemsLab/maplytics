import React from 'react'
import { render, screen } from '@testing-library/react'
import StatCard from '../StatCard'

describe('StatCard', () => {
  const defaultProps = {
    label: 'Test Label',
    value: '100',
    description: 'Test Description',
  }

  it('renders the label and value correctly', () => {
    render(<StatCard {...defaultProps} />)
    
    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('renders "N/A" when value is not provided', () => {
    render(<StatCard label="Test Label" />)
    
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('renders the icon when provided', () => {
    const MockIcon = (props) => <svg data-testid="mock-icon" {...props} />
    render(<StatCard {...defaultProps} icon={MockIcon} />)
    
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
  })
})
