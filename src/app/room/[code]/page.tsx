"use client";

import confetti from "canvas-confetti";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Copy, RefreshCw, Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { groupCards } from "@/lib/grouping";
import { getSavedName, getSessionId, saveName } from "@/lib/session";
import type { CardWithParticipant, Room } from "@/types";

gsap.registerPlugin(ScrollTrigger);

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const [sessionId, setSessionId] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const revealRef = useRef<HTMLDivElement>(null);

  const me = room?.participants.find((p) => p.sessionId === sessionId);
  const isHost = room?.hostSessionId === sessionId;
  const roundCards = useMemo(() => room?.cards.filter((card) => card.roundNumber === room.roundNumber) ?? [], [room]);
  const myCards = roundCards.filter((card) => card.participantId === me?.id);
  const cardsWithPeople = useMemo<CardWithParticipant[]>(() => {
    if (!room) return [];
    return roundCards.flatMap((card) => {
      const participant = room.participants.find((person) => person.id === card.participantId);
      return participant ? [{ ...card, participant }] : [];
    });
  }, [room, roundCards]);
  const groups = useMemo(() => groupCards(cardsWithPeople), [cardsWithPeople]);

  useEffect(() => {
    setSessionId(getSessionId());
    setName(getSavedName());
  }, []);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    async function load() {
      const res = await fetch(`/api/room?code=${code}`, { cache: "no-store" });
      const body = await res.json();
      if (!alive) return;
      if (res.ok) setRoom(body);
      else setError(body.error ?? "Room not found.");
    }
    load();
    const timer = setInterval(load, 1200);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [code]);

  useEffect(() => {
    if (room?.status !== "revealed" || !revealRef.current) return;
    gsap.fromTo(
      ".reveal-card",
      { y: 80, opacity: 0.2, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.09, ease: "back.out(1.4)", scrollTrigger: { trigger: revealRef.current, start: "top 78%", scrub: 0.6 } },
    );
    gsap.to(".scrub-word", { opacity: 1, stagger: 0.04, scrollTrigger: { trigger: revealRef.current, start: "top 85%", end: "top 35%", scrub: true } });
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.72 } });
  }, [room?.status, room?.roundNumber]);

  async function act(payload: Record<string, unknown>) {
    setError("");
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, sessionId, ...payload }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error ?? "Could not update room.");
    setRoom(body);
    return body;
  }

  async function submitAnswer() {
    const body = await act({ action: "submit", text: answer });
    if (body) setAnswer("");
  }

  if (error && !room) return <Shell code={code}><Message text={error} /></Shell>;
  if (!room) return <Shell code={code}><Message text="Loading room." /></Shell>;

  if (!me) {
    return (
      <Shell code={code}>
        <section className="mx-auto flex min-h-screen max-w-md items-center px-5 py-24">
          <div className="w-full rounded-[2rem] border border-white/15 bg-black/35 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-200">Room {code}</p>
            <h1 className="mt-3 text-5xl font-black leading-none">Name on folded card?</h1>
            <label className="mt-8 block text-sm font-bold" htmlFor="name">Display name</label>
            <input id="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-14 w-full rounded-2xl bg-white px-4 text-lg font-black text-stone-950 outline-none" placeholder="Almond" />
            <button
              onClick={() => {
                saveName(name);
                act({ action: "join", displayName: name });
              }}
              className="mt-4 min-h-14 w-full rounded-2xl bg-orange-500 font-black text-white"
            >
              Join
            </button>
            {error && <p className="mt-4 rounded-2xl bg-red-500/15 p-3 text-sm text-red-100">{error}</p>}
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell code={code}>
      <section className="mx-auto max-w-md px-4 pb-32 pt-28">
        <div className="rounded-[2rem] border border-white/15 bg-white/[0.08] p-5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-orange-200">{room.status.toUpperCase()} · ROUND {room.roundNumber}</p>
              <h1 className="mt-2 text-4xl font-black leading-none">{room.prompt || "Host is writing prompt."}</h1>
            </div>
            <button onClick={() => navigator.clipboard?.writeText(location.href)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-stone-950" aria-label="Copy room link">
              <Copy size={20} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {room.participants.map((person) => {
              const count = roundCards.filter((card) => card.participantId === person.id).length;
              return <span key={person.id} className="rounded-full bg-white/10 px-3 py-2 text-sm font-bold">{count || "·"} {person.avatar} {person.displayName}</span>;
            })}
          </div>
        </div>

        {isHost && (
          <div className="mt-4 rounded-[2rem] border border-white/15 bg-black/35 p-5 backdrop-blur">
            <label className="text-sm font-bold text-orange-200" htmlFor="prompt">Prompt</label>
            <textarea id="prompt" disabled={room.status !== "waiting"} value={room.prompt} onChange={(event) => act({ action: "patch", patch: { prompt: event.target.value } })} className="mt-2 min-h-24 w-full rounded-2xl bg-white px-4 py-3 font-bold text-stone-950 outline-none disabled:opacity-70" placeholder="Where should we eat tonight?" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button disabled={!room.prompt.trim() || room.status !== "waiting"} onClick={() => act({ action: "patch", patch: { status: "writing" } })} className="min-h-12 rounded-2xl bg-white font-black text-stone-950 disabled:opacity-40">Start</button>
              <button disabled={!roundCards.length || room.status !== "writing"} onClick={() => act({ action: "patch", patch: { status: "revealed" } })} className="min-h-12 rounded-2xl bg-orange-500 font-black text-white disabled:opacity-40">Reveal</button>
              <button onClick={() => act({ action: "patch", patch: { newRound: true } })} className="grid min-h-12 place-items-center rounded-2xl border border-white/20 text-white" aria-label="New round"><RefreshCw /></button>
            </div>
          </div>
        )}

        {room.status === "writing" && (
          <div className="mt-4 rounded-[2rem] border border-white/15 bg-white/[0.08] p-5">
            <p className="font-bold text-stone-200">{roundCards.length} cards from {new Set(roundCards.map((card) => card.participantId)).size} people</p>
            <div className="mt-4 rounded-3xl border border-white/20 bg-orange-100 p-4 text-stone-950 shadow-2xl">
              <p className="text-sm font-black uppercase tracking-[0.16em]">Your next card</p>
              <input value={answer} maxLength={100} onChange={(event) => setAnswer(event.target.value)} className="mt-3 min-h-14 w-full rounded-2xl border border-stone-950/10 bg-white px-4 text-lg font-black outline-none" placeholder="Pizza" />
              <button onClick={submitAnswer} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 font-black text-white"><Send size={18} /> Fold card</button>
            </div>
            {myCards.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {myCards.map((card, index) => (
                  <PlayingCard key={card.id} text={`Card ${index + 1}`} subtext="Folded" folded tone={index} />
                ))}
              </div>
            )}
          </div>
        )}

        {room.status === "revealed" && (
          <section ref={revealRef} className="mt-16">
            <h2 className="text-5xl font-black leading-none">
              {"Matches surfaced from the table.".split(" ").map((word) => <span key={word} className="scrub-word opacity-20">{word} </span>)}
            </h2>
            <div className="mt-8 space-y-4">
              {groups.map((group, index) => (
                <motion.article key={group.id} initial={{ rotateX: -80 }} animate={{ rotateX: 0 }} transition={{ delay: index * 0.08, type: "spring" }} className="reveal-card rounded-[2rem] border border-white/15 bg-white/[0.1] p-5 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black capitalize">{group.label}</h3>
                    <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-white">{group.cards.length}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {group.cards.map((card, cardIndex) => <PlayingCard key={card.id} text={card.text} subtext={`${card.participant.avatar} ${card.participant.displayName}`} tone={cardIndex} />)}
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        )}

        {error && <p className="mt-4 rounded-2xl bg-red-500/15 p-3 text-sm text-red-100">{error}</p>}
      </section>
    </Shell>
  );
}

function Shell({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden text-stone-50">
      <nav className="fixed left-1/2 top-4 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full border border-white/15 bg-black/45 px-4 py-3 backdrop-blur-xl">
        <a href="/" className="font-black">MatchDeck</a>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-stone-950">{code}</span>
      </nav>
      {children}
    </main>
  );
}

function Message({ text }: { text: string }) {
  return (
    <section className="grid min-h-screen place-items-center px-5">
      <div className="rounded-[2rem] border border-white/15 bg-black/35 p-6 text-center shadow-2xl backdrop-blur">
        <Sparkles className="mx-auto text-orange-300" />
        <p className="mt-4 text-2xl font-black">{text}</p>
        <a className="mt-5 inline-grid min-h-12 place-items-center rounded-2xl bg-white px-5 font-black text-stone-950" href="/">Home</a>
      </div>
    </section>
  );
}

function PlayingCard({ text, subtext, folded = false, tone = 0 }: { text: string; subtext: string; folded?: boolean; tone?: number }) {
  const red = tone % 2 === 0;
  return (
    <article className={`relative aspect-[5/7] overflow-hidden rounded-2xl border-2 bg-stone-50 p-3 text-stone-950 shadow-xl ${red ? "border-red-600" : "border-stone-950"} ${folded ? "folded" : ""}`}>
      <div className={`absolute left-2 top-2 text-center font-black leading-none ${red ? "text-red-600" : "text-stone-950"}`}>
        <div>A</div>
        <div className="text-[0.55rem]">F</div>
      </div>
      <div className={`absolute bottom-2 right-2 rotate-180 text-center font-black leading-none ${red ? "text-red-600" : "text-stone-950"}`}>
        <div>A</div>
        <div className="text-[0.55rem]">F</div>
      </div>
      <div className="grid h-full place-items-center rounded-xl border border-stone-950/10 bg-[radial-gradient(circle_at_center,rgba(251,146,60,.18),transparent_42%)] px-2 text-center">
        <div>
          <p className={`text-[0.62rem] font-black uppercase tracking-[0.16em] ${red ? "text-red-700" : "text-stone-700"}`}>{subtext}</p>
          <p className="mt-2 break-words text-2xl font-black leading-none">{text}</p>
        </div>
      </div>
    </article>
  );
}
