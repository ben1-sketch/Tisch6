/** Rückmeldung einer Admin-Aktion an das Formular */
export type ActionResult = { ok: boolean; message: string } | null;

export type LoginState = { error: string } | null;
