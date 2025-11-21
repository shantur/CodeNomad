import { createSignal } from "solid-js"

export type AlertVariant = "info" | "warning" | "error"

export type AlertDialogState = {
  type?: "alert" | "confirm"
  title?: string
  message: string
  detail?: string
  variant?: AlertVariant
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
  resolve?: (value: boolean) => void
}

const [alertDialogState, setAlertDialogState] = createSignal<AlertDialogState | null>(null)

export function showAlertDialog(message: string, options?: Omit<AlertDialogState, "message">) {
  setAlertDialogState({
    type: "alert",
    message,
    ...options,
  })
}

export function showConfirmDialog(message: string, options?: Omit<AlertDialogState, "message">): Promise<boolean> {
  const activeElement = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null
  activeElement?.blur()

  return new Promise<boolean>((resolve) => {
    setAlertDialogState({
      type: "confirm",
      message,
      ...options,
      resolve,
    })
  })
}

export function dismissAlertDialog() {
  setAlertDialogState(null)
}

export { alertDialogState }
