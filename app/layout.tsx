import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/error-boundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Limina FIX Analyzer',
  description: 'Production-ready FIX protocol message analyzer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
