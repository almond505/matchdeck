"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MatchDeckLogo } from "@/components/matchdeck-logo";
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
    <main className="w-full max-w-full overflow-x-hidden text-[#f7f0d9]">
      <nav className="table-nav fixed top-4 z-40 flex items-center justify-between border border-[#f7d57a]/30 bg-[#21110d]/85 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <MatchDeckLogo wordmark className="font-display text-sm font-black uppercase tracking-[0.16em]" />
        <button onClick={create} className="rounded-md bg-[#f7d57a] px-4 py-2 text-sm font-black text-[#19100d] transition-transform duration-300 hover:-translate-y-0.5">
          Create table
        </button>
      </nav>

      <section className="relative mx-auto flex min-h-screen max-w-7xl items-center px-5 py-28 md:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <h1 className="max-w-6xl text-balance font-display text-[2.45rem] font-black leading-[0.92] sm:text-[clamp(3rem,5vw,5.4rem)]">Fold your ideas. Find your matches.</h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#e8d8ad]">A fun mobile web app for secret brainstorming, dramatic reveals, and matching ideas with friends.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={create} disabled={!sessionId || busy} className="min-h-12 rounded-md bg-[#f7d57a] px-6 font-black text-[#19100d] shadow-2xl shadow-black/20 transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60">
                {busy ? "Setting table" : "Create a table"}
              </button>
              <a href="#join" className="grid min-h-12 place-items-center rounded-md border border-[#f7d57a]/45 bg-[#24120e]/80 px-6 font-black text-[#f7f0d9] transition-colors hover:bg-[#3a1b13]">Join a table</a>
            </div>
            {error && <p className="mt-4 rounded-lg border border-red-200/25 bg-red-950/55 p-3 text-sm text-red-100">{error}</p>}
          </div>
          <HomeTable />
        </div>
      </section>

      <section className="px-5 py-32 md:px-8 md:py-48">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-5xl font-display text-[clamp(2.8rem,6vw,5.5rem)] font-black leading-[0.92]">A better room for quiet ideas and loud reveals.</h2>
          <div className="mt-12 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
            {[
              ["md:col-span-2 md:row-span-2", "Folded cards", "Every idea lands face down on the shared table. Nobody sees a message until reveal."],
              ["md:col-span-1 md:row-span-1", "Keep dealing", "Each person can add as many cards as the round needs."],
              ["md:col-span-1 md:row-span-1", "One table link", "No accounts. Pass the code and take a seat."],
              ["md:col-span-2 md:row-span-1", "Matches emerge", "Pizza, pizza!, and close typos get dealt together when the cards flip."],
            ].map(([span, title, text]) => (
              <article key={title} className={`group overflow-hidden border border-[#f7d57a]/25 bg-[#24120e]/70 p-6 transition-colors duration-500 hover:bg-[#351913] ${span}`}>
                <div className="flex h-full flex-col justify-between gap-14">
                  <Sparkles className="text-[#f7d57a] transition-transform duration-700 ease-out group-hover:scale-110" />
                  <div>
                    <h3 className="font-display text-3xl font-black">{title}</h3>
                    <p className="mt-3 max-w-md text-[#e8d8ad]">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-32 md:px-8 md:py-48">
        <div className="casino-table-rail mx-auto max-w-7xl p-3 sm:p-5">
          <div className="casino-felt grid gap-8 p-7 md:grid-cols-[0.85fr_1.15fr] md:p-12">
            <p className="font-display text-4xl font-black leading-none text-[#f7f0d9] md:text-6xl">Nothing gets lost in the shuffle.</p>
            <p className="self-end text-xl leading-relaxed text-[#e8d8ad]">Type directly onto a card. Fold it down. Watch the whole table fill up. Then let the host turn over the room&apos;s shared thinking.</p>
          </div>
        </div>
      </section>

      <section id="join" className="px-5 pb-32 pt-12 md:px-8 md:pb-48">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-[clamp(3rem,7vw,6rem)] font-black leading-[0.9]">Take a seat.</h2>
          <div className="mt-9 flex gap-2">
            <input id="room-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="MANGO7" className="min-h-14 min-w-0 flex-1 rounded-md border-2 border-[#f7d57a]/40 bg-[#f7f0d9] px-4 text-lg font-black uppercase text-[#19100d] outline-none focus:border-[#f7d57a]" aria-label="Room code" />
            <button onClick={join} className="grid min-h-14 w-14 place-items-center rounded-md bg-[#f7d57a] text-[#19100d] transition-transform duration-300 hover:-translate-y-0.5" aria-label="Join room"><ArrowRight /></button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#f7d57a]/20 px-5 py-8 text-center text-sm font-bold text-[#bfae84]">MatchDeck · Fold ideas together.</footer>
    </main>
  );
}

function HomeTable() {
  return (
    <div className="casino-table-rail p-3 shadow-2xl">
      <div className="casino-felt min-h-[25rem] p-5 sm:min-h-[31rem]">
        <p className="text-center font-display text-xs font-black uppercase tracking-[0.24em] text-[#f7d57a]">MatchDeck table</p>
        <div className="card-back absolute left-[12%] top-[25%] aspect-[5/7] w-[26%] rotate-[-10deg] shadow-2xl"><div className="card-back-inner grid h-full place-items-center"><MatchDeckLogo className="text-[#f7d57a]" /></div></div>
        <div className="card-back absolute left-[38%] top-[18%] aspect-[5/7] w-[29%] rotate-[5deg] shadow-2xl"><div className="card-back-inner grid h-full place-items-center"><MatchDeckLogo className="text-[#f7d57a]" /></div></div>
        <div className="card-back absolute right-[10%] top-[31%] aspect-[5/7] w-[25%] rotate-[13deg] shadow-2xl"><div className="card-back-inner grid h-full place-items-center"><MatchDeckLogo className="text-[#f7d57a]" /></div></div>
        <p className="absolute inset-x-6 bottom-6 text-center font-display text-2xl font-black text-[#f7f0d9]">Ideas on the felt.</p>
      </div>
    </div>
  );
}
