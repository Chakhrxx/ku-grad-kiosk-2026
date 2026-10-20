import { useContext } from 'react'
import { KioskContext } from '@/context/KioskContext'

export function useKiosk() {
  const ctx = useContext(KioskContext)
  if (!ctx) throw new Error('useKiosk must be used inside <KioskProvider>')
  return ctx
}
