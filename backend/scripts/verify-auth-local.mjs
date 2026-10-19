import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { stdin as input, stdout as output } from "node:process";

const userId = "393edf13-912a-4e82-9ac2-e362303dcea7";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function readHidden(prompt) {
  return new Promise((resolve) => {
    output.write(prompt);
    input.setRawMode?.(true);
    input.resume();
    let value = "";
    const onData = (chunk) => {
      const key = chunk.toString();
      if (key === "\u0003") process.exit(130);
      if (key === "\r" || key === "\n") {
        output.write("\n");
        input.setRawMode?.(false);
        input.pause();
        input.removeListener("data", onData);
        resolve(value);
      } else if (key === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += key;
      }
    };
    input.on("data", onData);
  });
}

const password = await readHidden("Pega la contraseña de tu usuario Auth: ");

try {
  const rows = await sql`
    select email
    from auth.users
    where id = ${userId}
    limit 1
  `;

  if (!rows[0]?.email) {
    throw new Error("No se encontró el correo del usuario Auth indicado");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: rows[0].email,
    password,
  });

  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Supabase no devolvió una sesión");
  }

  console.log("supabase_auth=OK");

  const accessRows = await sql`
    select up.status as profile_status, rm.role, rm.status as membership_status
    from public.user_profiles up
    join public.restaurant_memberships rm on rm.user_id = up.id
    join public.restaurants r on r.id = rm.restaurant_id
    where up.id = ${userId}
      and r.slug = 'demo-restaurante'
    limit 1
  `;
  const access = accessRows[0];
  console.log(`profile=${access?.profile_status ?? "MISSING"}`);
  console.log(`membership=${access?.membership_status ?? "MISSING"}`);
  console.log(`role=${access?.role ?? "MISSING"}`);

  const response = await fetch(
    "http://localhost:3000/api/internal/restaurants/demo-restaurante/orders",
    {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  );

  console.log(`HTTP status: ${response.status}`);
  console.log(await response.text());
} catch (error) {
  console.error(`Prueba Auth fallida: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
