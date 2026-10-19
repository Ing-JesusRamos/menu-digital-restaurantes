"use client";

import { FormEvent, useEffect, useState } from "react";
import { UserPlus, Users } from "lucide-react";

type User = { id: string; displayName: string; phone: string | null; status: string; role: string; membershipStatus: string; };
const roleLabels: Record<string, string> = { restaurant_admin: "Administrador", waiter: "Mesero", kitchen: "Cocina" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ displayName: "", email: "", role: "waiter", reason: "" });
  const slug = process.env.NEXT_PUBLIC_RESTAURANT_SLUG ?? "demo-restaurante";

  useEffect(() => {
    fetch(`/api/internal/restaurants/${slug}/users`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los usuarios.");
        setUsers(data.users);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [slug]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const response = await fetch(`/api/internal/restaurants/${slug}/users`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "No se pudo crear la solicitud."); return; }
    setMessage("Solicitud enviada para aprobación.");
    setForm({ displayName: "", email: "", role: "waiter", reason: "" });
  }

  return (
    <main className="admin-shell"><div className="container">
      <header className="admin-header"><div><p className="eyebrow">Administración del restaurante</p><h1>Usuarios</h1><p className="hero-copy">Gestiona el equipo y solicita nuevas cuentas con permisos controlados.</p></div><Users size={36} aria-hidden="true" /></header>
      {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
      {message && <p className="admin-alert admin-alert-success" role="status">{message}</p>}
      <section className="admin-grid">
        <article className="admin-card"><h2>Equipo actual</h2>{users.length === 0 ? <p className="empty-state">No hay usuarios disponibles o necesitas iniciar sesión.</p> : <div className="user-list">{users.map((user) => <div className="user-row" key={user.id}><div><strong>{user.displayName}</strong><span>{roleLabels[user.role] ?? user.role} · {user.phone ?? "Sin teléfono"}</span></div><span className={`status status-${user.status}`}>{user.status}</span></div>)}</div>}</article>
        <article className="admin-card"><h2><UserPlus size={20} aria-hidden="true" /> Solicitar usuario</h2><form className="user-form" onSubmit={submitRequest}><label>Nombre<input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Rol<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="waiter">Mesero</option><option value="kitchen">Cocina</option><option value="restaurant_admin">Administrador</option></select></label><label>Motivo (opcional)<textarea rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label><button className="add-button" type="submit">Enviar solicitud</button></form></article>
      </section>
    </div></main>
  );
}
