'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        margin: 0,
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
              color: 'white',
              borderRadius: '0.75rem',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
