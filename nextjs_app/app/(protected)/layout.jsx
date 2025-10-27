import ProtectedRoute from '@/components/ProtectedRoute'
import React from 'react'

export default function layout({children}) {
  return (
    <ProtectedRoute>{children}</ProtectedRoute>
  )
}
