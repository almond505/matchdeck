"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSessionId } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setSessionId(getSessionId()), []);

  async function create() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", sessionId }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Could not create room.");
    router.push(`/room/${body.roomCode}`);
  }

  function join() {
    const clean = code.trim().toUpperCase();
    if (!clean) return setError("Enter room code first.");
    router.push(`/room/${clean}`);
  }

  return (
    <main className="w-full max-w-full overflow-x-hidden text-stone-50">
      <nav className="fixed left-4 top-4 z-40 flex w-[22rem] max-w-[calc(100vw-2rem)] items-center justify-between rounded-full border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-xl md:left-1/2 md:w-[calc(100vw-2rem)] md:max-w-3xl md:-translate-x-1/2">
        <span className="font-display text-sm font-black uppercase tracking-[0.24em]">MatchDeck</span>
        <button onClick={create} className="rounded-full bg-stone-50 px-4 py-2 text-sm font-bold text-stone-950 shadow-xl shadow-orange-500/20">
          Create
        </button>
      </nav>

      <section className="relative flex min-h-screen items-center px-5 py-32">
        <div className="absolute inset-0 -z-10 bg-[url('https://picsum.photos/seed/folded-brainstorm-cards/1920/1080')] bg-cover bg-center opacity-35 grayscale contrast-125 mix-blend-luminosity" />
        <div className="grid w-full max-w-[22rem] items-end gap-10 md:mx-auto md:max-w-6xl md:grid-cols-[1.1fr_.9fr]">
          <div>
            <h1 className="max-w-[22rem] text-wrap font-display text-[clamp(2.65rem,12vw,6rem)] font-black leading-[0.9] tracking-normal md:max-w-6xl">
              Fold your ideas. Find your matches.
            </h1>
            <p className="mt-7 max-w-[22rem] text-lg text-stone-200 md:max-w-xl">
              A fun mobile web app for secret brainstorming, dramatic reveals, and matching ideas with friends.
            </p>
            <div className="mt-9 flex gap-3">
              <button onClick={create} disabled={!sessionId || busy} className="min-h-12 rounded-full bg-orange-500 px-6 font-black text-white shadow-2xl shadow-orange-500/30 disabled:opacity-60">
                {busy ? "Creating" : "Create room"}
              </button>
              <a href="#join" className="grid min-h-12 place-items-center rounded-full border border-white/25 bg-white/10 px-6 font-black text-white backdrop-blur">
                Join room
              </a>
            </div>
            {error && <p className="mt-4 rounded-2xl bg-red-500/15 p-3 text-sm text-red-100">{error}</p>}
          </div>

          <div className="group overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur">
            <div className="relative min-h-[26rem] overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.35),transparent_18rem),linear-gradient(145deg,#ffb55a,#f45b2d_45%,#27130b)] transition-transform duration-700 ease-out group-hover:scale-105">
              {["Sushi", "Pizza", "ไก่ทอด", "Tokyo"].map((item, index) => (
                <div
                  key={item}
                  className="absolute left-8 right-8 rounded-3xl border border-white/35 bg-orange-100 p-5 text-stone-950 shadow-2xl"
                  style={{ top: `${4 + index * 5.8}rem`, transform: `rotate(${[-8, 4, -3, 7][index]}deg)` }}
                >
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-700">Folded card</p>
                  <p className="mt-3 text-4xl font-black">{item}</p>
                </div>
              ))}
              <div className="absolute inset-x-8 bottom-8 rounded-3xl bg-stone-950/80 p-5 backdrop-blur">
                <p className="text-sm font-bold text-orange-200">3 matching answers found</p>
                <p className="mt-2 text-3xl font-black">Reveal makes room agree faster.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-32 md:py-48">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-5xl font-display text-5xl font-black leading-none md:text-7xl">
            Built for phone-in-hand rooms{" "}
            <span className="mx-2 inline-block h-10 w-24 rounded-full bg-[url('https://picsum.photos/seed/tiny-cards/300/120')] bg-cover bg-center align-middle grayscale contrast-125" />
            not dashboards.
          </h2>
          <div className="mt-12 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[13rem]">
            {[
              ["md:col-span-2 md:row-span-3", "Folded cards", "Answers stay hidden until reveal, so loud voices do not steer round."],
              ["md:col-span-1 md:row-span-1", "No login", "Session lives in browser. Join with code."],
              ["md:col-span-1 md:row-span-1", "Fuzzy groups", "Pizza, pizza!, and close typos land together."],
              ["md:col-span-2 md:row-span-1", "Host rhythm", "Prompt, writing, reveal, next round. Nothing extra."],
            ].map(([span, title, text]) => (
              <article key={title} className={`group overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] p-6 ${span}`}>
                <div className="flex h-full flex-col justify-between">
                  <Sparkles className="text-orange-300 transition-transform duration-700 ease-out group-hover:scale-110" />
                  <div>
                    <h3 className="text-3xl font-black">{title}</h3>
                    <p className="mt-3 text-stone-300">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="join" className="px-5 py-32 md:py-48">
        <div className="mx-auto max-w-md rounded-[2rem] border border-white/15 bg-black/35 p-5 shadow-2xl backdrop-blur">
          <label className="text-sm font-bold uppercase tracking-[0.18em] text-orange-200" htmlFor="room-code">
            Room code
          </label>
          <div className="mt-3 flex gap-2">
            <input id="room-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="MANGO7" className="min-h-14 min-w-0 flex-1 rounded-2xl border border-white/15 bg-white px-4 text-lg font-black uppercase text-stone-950 outline-none" />
            <button onClick={join} className="grid min-h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-white">
              <ArrowRight />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
