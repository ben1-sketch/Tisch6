"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/admin/types";

type Action = (state: ActionResult, form: FormData) => Promise<ActionResult>;
type ButtonTone = "primary" | "default" | "danger";

export type Submit = { label: string; name?: string; value?: string; tone?: ButtonTone; confirm?: string };

const BUTTONS: Record<ButtonTone, string> = {
  primary: "bg-rose-400 font-semibold text-night-950 hover:bg-rose-300",
  default: "border border-white/15 text-cloud hover:border-white/35",
  danger: "border border-red-400/50 text-red-300 hover:bg-red-500/10",
};

/**
 * Formular für eine Admin-Aktion: optional mit Rückfrage, zeigt „Bitte warten …“ und danach das Ergebnis.
 * Eingaben bleiben bei Fehlern stehen (kein automatisches Zurücksetzen).
 */
export function ActionForm({
  action,
  hidden,
  submit,
  confirm,
  tone = "default",
  resetOnSuccess = false,
  children,
  className = "",
}: {
  action: Action;
  hidden?: Record<string, string>;
  submit: string | Submit[];
  confirm?: string;
  tone?: ButtonTone;
  resetOnSuccess?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const form = useRef<HTMLFormElement>(null);
  const buttons: Submit[] = typeof submit === "string" ? [{ label: submit, tone, confirm }] : submit;

  useEffect(() => {
    if (state?.ok && resetOnSuccess) form.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const question = submitter?.dataset.confirm;
    if (question && !window.confirm(question)) return;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }

  return (
    <form ref={form} onSubmit={onSubmit} className={className}>
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="flex flex-wrap items-end gap-2">
        {children}
        {buttons.map((b) => (
          <button
            key={b.label}
            type="submit"
            name={b.name}
            value={b.value}
            data-confirm={b.confirm}
            disabled={pending}
            className={`rounded-full px-4 py-2 text-sm transition disabled:cursor-wait disabled:opacity-50 ${BUTTONS[b.tone ?? "default"]}`}
          >
            {b.label}
          </button>
        ))}
      </div>
      {pending && <p className="mt-2 animate-pulse text-sm text-mist">Bitte warten …</p>}
      {!pending && state && (
        <p role="status" className={`mt-2 whitespace-pre-line text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
