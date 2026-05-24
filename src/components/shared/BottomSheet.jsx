import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BottomSheet({ isOpen, onClose, title, children, fullHeight = false }) {
  const sheetRef = useRef(null)

  // Swipe down to dismiss
  useEffect(() => {
    const el = sheetRef.current
    if (!el || !isOpen) return

    let startY = 0
    let currentY = 0

    function onTouchStart(e) {
      startY = e.touches[0].clientY
    }
    function onTouchMove(e) {
      currentY = e.touches[0].clientY
      const delta = currentY - startY
      if (delta > 0) {
        el.style.transform = `translateY(${delta}px)`
        el.style.transition = 'none'
      }
    }
    function onTouchEnd() {
      const delta = currentY - startY
      if (delta > 100) {
        onClose()
      }
      el.style.transform = ''
      el.style.transition = ''
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            className={`fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1e] rounded-t-3xl ${
              fullHeight ? 'max-h-[92vh]' : 'max-h-[85vh]'
            } flex flex-col overflow-hidden`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="pt-3 pb-1 flex-shrink-0">
              <div className="sheet-handle" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-5 pt-2 pb-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold text-[#f4f4f5]">{title}</h2>
                <button
                  onClick={onClose}
                  className="touch-target w-8 h-8 rounded-full bg-[#242428] flex items-center justify-center text-[#a1a1aa] active:opacity-70"
                >
                  <CloseIcon />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
