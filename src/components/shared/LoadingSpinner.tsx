export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]
  return (
    <div className="flex items-center justify-center">
      <div className={`${s} animate-spin rounded-full border-2 border-dark-600 border-t-gold-500`} />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-dark-600 border-t-gold-500" />
        <p className="text-dark-400 text-sm">Cargando...</p>
      </div>
    </div>
  )
}
