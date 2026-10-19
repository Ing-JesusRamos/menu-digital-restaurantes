"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole, Utensils } from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => setReady(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else { setMessage("Contraseña actualizada. Ya puedes iniciar sesión."); setPassword(""); setConfirmation(""); }
    setLoading(false);
  }

  return <main className="auth-shell"><section className="auth-card" aria-labelledby="reset-title">
    <div className="brand auth-brand"><span className="brand-mark"><Utensils size={21} aria-hidden="true" /></span><span className="brand-name">Mesa<span className="brand-subtitle">seguridad de cuenta</span></span></div>
    <div><p className="eyebrow">Nueva contraseña</p><h1 id="reset-title">Protege tu acceso</h1><p className="auth-copy">Usa al menos 8 caracteres y no reutilices una contraseña anterior.</p></div>
    {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}{message && <p className="admin-alert admin-alert-success" role="status">{message}</p>}
    {!ready ? <p className="admin-alert admin-alert-error" role="alert">El enlace no es válido o ha expirado. Solicita uno nuevo.</p> : <form className="user-form" onSubmit={handleSubmit}><label>Nueva contraseña<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Repetir contraseña<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="add-button auth-submit" disabled={loading} type="submit"><LockKeyhole size={17} aria-hidden="true" />{loading ? "Guardando…" : "Guardar contraseña"}</button></form>}
    <Link className="auth-link" href="/login">Volver al inicio de sesión</Link>
  </section></main>;
}
