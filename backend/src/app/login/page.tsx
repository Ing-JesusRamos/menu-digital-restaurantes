"use client";

import { FormEvent, useState } from "react";
import { LogIn, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const contextResponse = await fetch("/api/auth/context");
      const context = await contextResponse.json();
      if (!contextResponse.ok) throw new Error(context.error ?? "La cuenta no tiene un perfil activo.");
      router.push(context.destination);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar sesión.");
    } finally { setLoading(false); }
  }

  return (
    <main className="auth-shell"><section className="auth-card" aria-labelledby="login-title">
      <div className="brand auth-brand"><span className="brand-mark"><Utensils size={21} aria-hidden="true" /></span><span className="brand-name">Mesa<span className="brand-subtitle">administración segura</span></span></div>
      <div><p className="eyebrow">Acceso administrativo</p><h1 id="login-title">Bienvenido de vuelta</h1><p className="auth-copy">Inicia sesión con la cuenta asignada por la plataforma.</p></div>
      {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
      <form className="user-form" onSubmit={handleSubmit}><label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="add-button auth-submit" disabled={loading} type="submit"><LogIn size={17} aria-hidden="true" />{loading ? "Entrando…" : "Iniciar sesión"}</button></form>
      <Link className="auth-link" href="/auth/forgot-password">¿Olvidaste tu contraseña?</Link>
      <p className="auth-note">Las cuentas y permisos son administrados por el superadministrador principal. No hay registro público.</p>
    </section></main>
  );
}
