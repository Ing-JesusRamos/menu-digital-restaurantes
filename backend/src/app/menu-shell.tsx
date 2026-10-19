"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Moon, Plus, Sun, Utensils } from "lucide-react";
import { useEffect, useState } from "react";

type Dish = { name: string; description: string; price: string; category: string; icon: string };
type ApiMenu = { categories: Array<{ name: string; dishes: Array<{ name: string; description: string | null; priceCents: number }> }> };

const fallbackDishes: Dish[] = [
  { name: "Bowl de temporada", description: "Vegetales asados, hierbas frescas y salsa de la casa.", price: "$12.90", category: "Principales", icon: "🥗" },
  { name: "Pan artesanal", description: "Masa madre, aceite de oliva y sal marina.", price: "$5.50", category: "Entradas", icon: "🥖" },
  { name: "Pasta al pomodoro", description: "Tomate asado, albahaca y parmesano.", price: "$14.00", category: "Principales", icon: "🍝" },
  { name: "Limonada de hierbabuena", description: "Limón fresco, hierbabuena y hielo.", price: "$4.50", category: "Bebidas", icon: "🍋" },
  { name: "Tarta de chocolate", description: "Chocolate oscuro, crema y frutos rojos.", price: "$7.00", category: "Entradas", icon: "🍰" },
  { name: "Café de la casa", description: "Grano tostado local, servido caliente.", price: "$3.50", category: "Bebidas", icon: "☕" },
];

export default function MenuShell() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [category, setCategory] = useState("Todos");
  const [dishes, setDishes] = useState<Dish[]>(fallbackDishes);
  const [menuLoading, setMenuLoading] = useState(true);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("mesa-theme") as "light" | "dark" | null;
    const preferred = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.dataset.theme = preferred;
  }, []);

  useEffect(() => {
    const slug = process.env.NEXT_PUBLIC_RESTAURANT_SLUG ?? "demo-restaurante";
    fetch(`/api/public/restaurants/${slug}/menu`)
      .then((response) => (response.ok ? response.json() as Promise<ApiMenu> : Promise.reject(new Error("menu unavailable"))))
      .then((data) => {
        const apiDishes = data.categories.flatMap((item) => item.dishes.map((dish) => ({
          name: dish.name,
          description: dish.description ?? "Preparado en nuestra cocina.",
          price: `$${(dish.priceCents / 100).toFixed(2)}`,
          category: item.name,
          icon: "🍽️",
        })));
        if (apiDishes.length > 0) setDishes(apiDishes);
      })
      .catch(() => undefined)
      .finally(() => setMenuLoading(false));
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("mesa-theme", next);
  }

  function addDish(name: string) {
    setAdded(name);
    window.setTimeout(() => setAdded(null), 2200);
  }

  const categories = ["Todos", ...Array.from(new Set(dishes.map((dish) => dish.category)))];
  const visibleDishes = category === "Todos" ? dishes : dishes.filter((dish) => dish.category === category);

  return (
    <main className="shell">
      <div className="container">
        <header className="topbar">
          <a className="brand" href="#menu" aria-label="Mesa, ir al menú">
            <span className="brand-mark"><Utensils size={21} aria-hidden="true" /></span>
            <span className="brand-name">Mesa<span className="brand-subtitle">menú digital</span></span>
          </a>
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Activar tema ${theme === "light" ? "oscuro" : "claro"}`}>
            {theme === "light" ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
          </button>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Bienvenido a la mesa</p>
          <h1 id="hero-title">Comida honesta, hecha para compartir.</h1>
          <p className="hero-copy">Explora nuestro menú, elige tus favoritos y envía tu comanda directamente desde la mesa.</p>
        </section>

        <section id="menu" aria-labelledby="menu-title">
          <div className="categories" aria-label="Categorías del menú">
            {categories.map((item) => (
              <button key={item} className="category" type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="menu-heading">
            <div><p className="eyebrow">Nuestra selección</p><h2 id="menu-title">Para empezar</h2></div>
            <p>{menuLoading ? "Cargando menú…" : `${visibleDishes.length} opciones`}</p>
          </div>
          <div className="menu-grid">
            <AnimatePresence mode="popLayout">
              {visibleDishes.map((dish) => (
                <motion.article className="dish-card" key={dish.name} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .2 }}>
                  <div className="dish-visual" aria-hidden="true"><span style={{ fontSize: "3.5rem" }}>{dish.icon}</span></div>
                  <div className="dish-body">
                    <h3>{dish.name}</h3>
                    <p>{dish.description}</p>
                    <div className="dish-footer"><span className="price">{dish.price}</span><button className="add-button" type="button" onClick={() => addDish(dish.name)}><Plus size={16} aria-hidden="true" /> Agregar</button></div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
      <AnimatePresence>{added && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><Check size={16} aria-hidden="true" /> {added} agregado</motion.div>}</AnimatePresence>
    </main>
  );
}
