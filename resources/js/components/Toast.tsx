import { useEffect } from "react";

export type ToastVariant = "success" | "error" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  variant = "success",
  onClose,
  duration = 3500,
}: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, duration);

    return () => window.clearTimeout(timer);
  }, [message, duration, onClose]);

  const iconPath =
    variant === "success"
      ? "M5 12.5 9.2 16.5 19 7"
      : variant === "error"
        ? "M7 7 17 17 M17 7 7 17"
        : "M12 8v4m0 4h.01 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18";

  const title =
    variant === "success"
      ? "Success"
      : variant === "error"
        ? "Something went wrong"
        : "Notice";

  return (
    <div
      className={`toast toast-${variant}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <div className="toast-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={iconPath} />
        </svg>
      </div>

      <div className="toast-content">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>

      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}