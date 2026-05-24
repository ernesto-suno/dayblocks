export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-2xl transition-all active:scale-95 select-none touch-target'

  const variants = {
    primary: 'bg-[#3b82f6] text-white active:bg-[#2563eb]',
    secondary: 'bg-[#242428] text-[#f4f4f5] active:bg-[#2e2e34]',
    ghost: 'text-[#a1a1aa] active:text-[#f4f4f5] active:bg-[#242428]',
    danger: 'bg-[#ef4444]/10 text-[#ef4444] active:bg-[#ef4444]/20',
    success: 'bg-[#22c55e]/10 text-[#22c55e] active:bg-[#22c55e]/20',
    yellow: 'bg-[#eab308]/10 text-[#eab308] active:bg-[#eab308]/20',
  }

  const sizes = {
    sm: 'text-sm px-3 h-9 gap-1.5',
    md: 'text-sm px-4 h-12 gap-2',
    lg: 'text-base px-5 h-14 gap-2',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${base}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-40 pointer-events-none' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
