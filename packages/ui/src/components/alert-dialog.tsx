import { Dialog } from "@kobalte/core/dialog"
import { Component, Show, createEffect } from "solid-js"
import { alertDialogState, dismissAlertDialog } from "../stores/alerts"
import type { AlertVariant, AlertDialogState } from "../stores/alerts"

const variantAccent: Record<AlertVariant, { badgeBg: string; badgeBorder: string; badgeText: string; symbol: string; fallbackTitle: string }> = {
  info: {
    badgeBg: "var(--badge-neutral-bg)",
    badgeBorder: "var(--border-base)",
    badgeText: "var(--accent-primary)",
    symbol: "i",
    fallbackTitle: "Heads up",
  },
  warning: {
    badgeBg: "rgba(255, 152, 0, 0.14)",
    badgeBorder: "var(--status-warning)",
    badgeText: "var(--status-warning)",
    symbol: "!",
    fallbackTitle: "Please review",
  },
  error: {
    badgeBg: "var(--danger-soft-bg)",
    badgeBorder: "var(--status-error)",
    badgeText: "var(--status-error)",
    symbol: "!",
    fallbackTitle: "Something went wrong",
  },
}

function dismiss(confirmed: boolean, payload?: AlertDialogState | null) {
  const current = payload ?? alertDialogState()
  if (current?.type === "confirm") {
    if (confirmed) {
      current.onConfirm?.()
    } else {
      current.onCancel?.()
    }
    current.resolve?.(confirmed)
  } else if (confirmed) {
    current?.onConfirm?.()
  }
  dismissAlertDialog()
}

const AlertDialog: Component = () => {
  let primaryButtonRef: HTMLButtonElement | undefined

  createEffect(() => {
    if (alertDialogState()) {
      queueMicrotask(() => {
        primaryButtonRef?.focus()
      })
    }
  })

  return (
    <Show when={alertDialogState()} keyed>
      {(payload) => {
        const variant = payload.variant ?? "info"
        const accent = variantAccent[variant]
        const title = payload.title || accent.fallbackTitle
        const isConfirm = payload.type === "confirm"
        const confirmLabel = payload.confirmLabel || (isConfirm ? "Confirm" : "OK")
        const cancelLabel = payload.cancelLabel || "Cancel"

        return (
          <Dialog
            open
            modal
            onOpenChange={(open) => {
              if (!open) {
                dismiss(false, payload)
              }
            }}
          >
            <Dialog.Portal>
              <Dialog.Overlay class="modal-overlay" />
              <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <Dialog.Content class="modal-surface w-full max-w-sm p-6 border border-base shadow-2xl" tabIndex={-1}>
                  <div class="flex items-start gap-3">
                    <div
                      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base font-semibold"
                      style={{
                        "background-color": accent.badgeBg,
                        "border-color": accent.badgeBorder,
                        color: accent.badgeText,
                      }}
                      aria-hidden
                    >
                      {accent.symbol}
                    </div>
                    <div class="flex-1">
                      <Dialog.Title class="text-lg font-semibold text-primary">{title}</Dialog.Title>
                      <Dialog.Description class="text-sm text-secondary mt-1 whitespace-pre-line">
                        {payload.message}
                        {payload.detail && <p class="mt-2 text-secondary">{payload.detail}</p>}
                      </Dialog.Description>
                    </div>
                  </div>

                  <div class="mt-6 flex justify-end gap-3">
                    {isConfirm && (
                      <button
                        type="button"
                        class="button-secondary"
                        onClick={() => dismiss(false, payload)}
                      >
                        {cancelLabel}
                      </button>
                    )}
                    <button
                      type="button"
                      class="button-primary"
                      ref={(el) => {
                        primaryButtonRef = el
                      }}
                      onClick={() => dismiss(true, payload)}
                    >
                      {confirmLabel}
                    </button>
                  </div>
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          </Dialog>
        )
      }}
    </Show>
  )
}

export default AlertDialog
