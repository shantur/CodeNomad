import toast from "solid-toast"

export type ToastVariant = "info" | "success" | "warning" | "error"

export type ToastPayload = {
  title?: string
  message: string
  variant: ToastVariant
  duration?: number
}

const variantAccent: Record<ToastVariant, { badge: string; border: string; text: string }> = {
  info: {
    badge: "bg-blue-500",
    border: "border-blue-500/40",
    text: "text-blue-100",
  },
  success: {
    badge: "bg-emerald-500",
    border: "border-emerald-500/40",
    text: "text-emerald-100",
  },
  warning: {
    badge: "bg-amber-500",
    border: "border-amber-500/40",
    text: "text-amber-100",
  },
  error: {
    badge: "bg-rose-500",
    border: "border-rose-500/40",
    text: "text-rose-100",
  },
}

export function showToastNotification(payload: ToastPayload) {
  const accent = variantAccent[payload.variant]
  const duration = payload.duration ?? 5000

  toast.custom(
    () => (
      <div class={`min-w-[280px] max-w-[360px] rounded-xl border px-4 py-3 shadow-xl bg-surface-secondary ${accent.border}`}>
        <div class="flex gap-3">
          <span class={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${accent.badge}`} />
          <div class="flex-1 text-sm leading-snug">
            {payload.title && <p class="font-semibold text-primary">{payload.title}</p>}
            <p class={`text-primary/90 ${payload.title ? "mt-1" : ""}`}>{payload.message}</p>
          </div>
        </div>
      </div>
    ),
    {
      duration,
      ariaProps: {
        role: "status",
        "aria-live": "polite",
      },
    },
  )
}
