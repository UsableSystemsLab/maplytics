import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Chat from '../Chat'

describe('Chat', () => {
    it('renders the default greeting message', () => {
        render(<Chat />)
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument()
    })

    it('renders a custom greeting message', () => {
        render(<Chat greeting="Welcome to Maplytics AI!" />)
        expect(screen.getByText('Welcome to Maplytics AI!')).toBeInTheDocument()
    })

    it('renders the message input textarea', () => {
        render(<Chat />)
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    })

    it('renders the send button', () => {
        render(<Chat />)
        const submitBtn = screen.getByRole('button')
        expect(submitBtn).toBeInTheDocument()
    })

    it('send button is disabled when input is empty', () => {
        render(<Chat />)
        const submitBtn = screen.getByRole('button')
        expect(submitBtn).toBeDisabled()
    })

    it('send button becomes enabled when input has text', () => {
        render(<Chat />)
        const textarea = screen.getByPlaceholderText('Type your message...')
        fireEvent.change(textarea, { target: { value: 'Hello' } })
        const submitBtn = screen.getByRole('button')
        expect(submitBtn).not.toBeDisabled()
    })

    it('adds user message when form is submitted', () => {
        render(<Chat />)
        const textarea = screen.getByPlaceholderText('Type your message...')
        fireEvent.change(textarea, { target: { value: 'Test message' } })
        fireEvent.submit(textarea.closest('form'))
        expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    it('clears the input after submission', () => {
        render(<Chat />)
        const textarea = screen.getByPlaceholderText('Type your message...')
        fireEvent.change(textarea, { target: { value: 'Hello' } })
        fireEvent.submit(textarea.closest('form'))
        expect(textarea.value).toBe('')
    })

    it('shows loading indicator after message is sent', () => {
        jest.useFakeTimers()
        render(<Chat />)
        const textarea = screen.getByPlaceholderText('Type your message...')
        fireEvent.change(textarea, { target: { value: 'Hello' } })
        fireEvent.submit(textarea.closest('form'))
        // Loading dots should appear immediately
        const loadingDots = document.querySelectorAll('.animate-bounce')
        expect(loadingDots.length).toBe(3)
        jest.useRealTimers()
    })

    it('applies custom className', () => {
        render(<Chat className="my-custom-class" />)
        const container = document.querySelector('.my-custom-class')
        expect(container).toBeInTheDocument()
    })
})
