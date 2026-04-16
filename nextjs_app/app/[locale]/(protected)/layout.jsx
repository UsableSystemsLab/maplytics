import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { ConfirmDialogProvider } from '@/hooks/useConfirm'
import React from 'react'

export default function layout({ children }) {
  return (
    <ProtectedRoute>
      <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
    </ProtectedRoute>
  )
}
