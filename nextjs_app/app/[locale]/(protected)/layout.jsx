import ProtectedRoute from '@/components/auth/ProtectedRoute'
import React from 'react'

export default function layout({children}) {
  return (
    <ProtectedRoute>{children}</ProtectedRoute>
  )
}
