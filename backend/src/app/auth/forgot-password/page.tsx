"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, Utensils } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error: resetError } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) setError(resetError.message);
    else setMessage("Si la cuenta existe, recibirás un enlace para cambiar la contraseña.");
    setLoading(false);
  }

  return <main className="auth-shell"><section className="auth-card" aria-labelledby="forgot-title">
    <div className="brand auth-brand"><span className="brand-mark"><Utensils size={21} aria-hidden="true" /></span><span className="brand-name">Mesa<span className="brand-subtitle">recuperación segura</span></span></div>
    <div><p className="eyebrow">Recuperar acceso</p><h1 id="forgot-title">Cambia tu contraseña</h1><p className="auth-copy">Te enviaremos un enlace al correo de la cuenta.</p></div>
    {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}{message && <p className="admin-alert admin-alert-success" role="status">{message}</p>}
    <form className="user-form" onSubmit={handleSubmit}><label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="add-button auth-submit" disabled={loading} type="submit"><Mail size={17} aria-hidden="true" />{loading ? "Enviando…" : "Enviar enlace"}</button></form>
    <Link className="auth-link" href="/login">Volver al inicio de sesión</Link>
  </section></main>;
}
