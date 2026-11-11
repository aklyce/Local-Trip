// Small accessible confirmation dialog (native modal <dialog>: Escape cancels, focus is
// contained and restored). Used before deleting a trip (FR-22).
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={onCancel}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-white p-6 text-ink shadow-2xl backdrop:bg-ink/40"
    >
      <h2 id="confirm-title" className="font-display text-3xl">
        {title}
      </h2>
      <div className="mt-2 text-sm text-ink-soft">{children}</div>
      <div className="mt-6 flex justify-end gap-2">
        {/* Cancel comes first so it receives initial focus. */}
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
