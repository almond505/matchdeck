"use client";

import confetti from "canvas-confetti";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, Copy, FoldVertical, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MatchDeckLogo } from "@/components/matchdeck-logo";
import { groupCards } from "@/lib/grouping";
import { getSavedName, getSessionId, saveName } from "@/lib/session";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { CardWithParticipant, PublicParticipant, RoomView } from "@/types";

gsap.registerPlugin(ScrollTrigger);

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();
  const [sessionId, setSessionId] = useState("");
  const [room, setRoom] = useState<RoomView | null>(null);
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isFolding, setIsFolding] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLElement>(null);

  const me = room?.participants.find((participant) => participant.id === room.viewer.participantId);
  const isHost = room?.viewer.isHost;
  const roundCards = useMemo(() => room?.cards.filter((card) => card.roundNumber === room.roundNumber) ?? [], [room]);
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

  const loadRoom = useCallback(async () => {
    const res = await fetch(`/api/room?code=${code}`, {
      cache: "no-store",
      headers: sessionId ? { "X-MatchDeck-Session": sessionId } : undefined,
    });
    const body = await res.json();
    if (res.ok) setRoom(body);
    else setError(body.error ?? "Room not found.");
  }, [code, sessionId]);

  useEffect(() => {
    if (!code) return;
    void loadRoom();
    const timer = window.setInterval(loadRoom, getSupabaseClient() ? 5000 : 1200);
    return () => window.clearInterval(timer);
  }, [code, loadRoom]);

  useEffect(() => {
    if (!room?.id) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`room-events-${room.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "room_events", filter: `room_id=eq.${room.id}` }, () => void loadRoom())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadRoom, room?.id]);

  useEffect(() => {
    if (room?.status !== "revealed" || !revealRef.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        ".reveal-card",
        { y: 80, opacity: 0.2, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, stagger: 0.09, ease: "back.out(1.4)", scrollTrigger: { trigger: revealRef.current, start: "top 78%", scrub: 0.6 } },
      );
      gsap.to(".scrub-word", { opacity: 1, stagger: 0.04, scrollTrigger: { trigger: revealRef.current, start: "top 85%", end: "top 35%", scrub: true } });
    }, revealRef);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.72 }, colors: ["#f7d57a", "#f4f0df", "#af1f2e"] });
    return () => context.revert();
  }, [room?.status, room?.roundNumber]);

  async function act(payload: Record<string, unknown>) {
    setError("");
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, sessionId, ...payload }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Could not update room.");
      return null;
    }
    setRoom(body);
    return body;
  }

  async function submitAnswer() {
    const text = answer.trim();
    if (!text || isFolding) return;
    setIsFolding(true);

    await new Promise<void>((resolve) => {
      if (!composerRef.current) return resolve();
      gsap.to(composerRef.current, {
        duration: 0.48,
        ease: "power3.in",
        opacity: 0.08,
        rotateX: -92,
        scale: 0.72,
        transformOrigin: "top center",
        y: 82,
        onComplete: resolve,
      });
    });

    const body = await act({ action: "submit", text });
    if (body) setAnswer("");
    gsap.set(composerRef.current, { clearProps: "opacity,rotateX,scale,transformOrigin,y" });
    setIsFolding(false);
  }

  async function voteForGroup(groupId: string) {
    if (await act({ action: "vote", groupId })) {
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.62 }, colors: ["#62e7ef", "#f7d57a", "#9e1928"] });
    }
  }

  async function copyRoomLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setLinkCopied(true);
    } catch {
      setError("Could not copy the table link.");
    }
  }

  if (error && !room) return <Shell code={code}><Message text={error} /></Shell>;
  if (!room) return <Shell code={code}><Message text="Setting the table." /></Shell>;

  if (!me) {
    return (
      <Shell code={code}>
        <section className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-24">
          <div className="casino-table-rail w-full p-3">
            <div className="casino-felt p-6 sm:p-8">
              <p className="font-display text-sm font-black uppercase tracking-[0.24em] text-[#f7d57a]">Table {code}</p>
              <h1 className="mt-4 max-w-xl font-display text-5xl font-black leading-[0.92] text-[#f7f0d9]">Put your name at the table.</h1>
              <label className="mt-9 block text-sm font-bold text-[#e8d8ad]" htmlFor="name">Display name</label>
              <input id="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-14 w-full rounded-lg border-2 border-[#311a13] bg-[#f7f0d9] px-4 text-lg font-black text-[#19100d] outline-none ring-offset-2 focus:ring-2 focus:ring-[#f7d57a]" placeholder="Your name" />
              <button
                onClick={() => {
                  saveName(name);
                  act({ action: "join", displayName: name });
                }}
                className="mt-4 min-h-14 w-full rounded-lg bg-[#f7d57a] font-black text-[#19100d] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#fff1b8]"
              >
                Take a seat
              </button>
              {error && <p className="mt-4 rounded-lg border border-red-200/25 bg-red-950/55 p-3 text-sm text-red-100">{error}</p>}
            </div>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell code={code}>
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-black uppercase tracking-[0.26em] text-[#f7d57a]">Round {room.roundNumber} · {room.status}</p>
            <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.4rem,6vw,5.5rem)] font-black leading-[0.92] text-[#f7f0d9]">{room.prompt || "The dealer is choosing a prompt."}</h1>
          </div>
          <button onClick={copyRoomLink} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#f7d57a]/45 bg-[#24120e]/80 px-4 font-bold text-[#f7f0d9] transition-colors hover:bg-[#3a1b13]" aria-label={linkCopied ? "Room link copied" : "Copy room link"}>
            {linkCopied ? <Check size={18} /> : <Copy size={18} />} {linkCopied ? "Copied" : "Copy table"}
          </button>
        </header>

        <div className="casino-table-rail p-3 sm:p-4">
          <div className="casino-felt min-h-[25rem] p-4 sm:min-h-[31rem] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f7d57a]/30 pb-4 text-[#e8d8ad]">
              <p className="font-display text-sm font-black uppercase tracking-[0.22em]">The felt</p>
              <p className="text-sm font-bold">{roundCards.length} {room.status === "revealed" ? "face-up" : "folded"} {roundCards.length === 1 ? "card" : "cards"} · {new Set(roundCards.map((card) => card.participantId)).size} players</p>
            </div>

            {room.status === "waiting" ? (
              <div className="grid min-h-[17rem] place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto text-[#f7d57a]" />
                  <p className="mt-4 text-xl font-black text-[#f7f0d9]">The dealer will open the round soon.</p>
                </div>
              </div>
            ) : room.status === "revealed" ? (
              <div className="reveal-table-grid mt-5" aria-label="All face-up cards on the table">
                {cardsWithPeople.map((card) => <PlayingCard key={card.id} text={card.text} card={card.participant} />)}
                {cardsWithPeople.length === 0 && <p className="col-span-full grid min-h-44 place-items-center text-center font-bold text-[#e8d8ad]">No cards were dealt this round.</p>}
              </div>
            ) : (
              <div className="table-card-grid mt-5" aria-label="Folded cards on the table">
                {roundCards.map((card, index) => <CardBack key={card.id} index={index} />)}
                {roundCards.length === 0 && <p className="col-span-full grid min-h-44 place-items-center text-center font-bold text-[#e8d8ad]">No cards yet. Be the first to fold one down.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Players at the table">
          {room.participants.map((person) => {
            const count = roundCards.filter((card) => card.participantId === person.id).length;
            return <span key={person.id} className="rounded-full border border-[#f7d57a]/25 bg-[#26130f]/75 px-3 py-2 text-sm font-bold text-[#f7f0d9]">{playerCardLabel(person)} {person.displayName} · {count || "no cards"}</span>;
          })}
        </div>

        {isHost && <DealerControls key={`${room.id}-${room.roundNumber}`} room={room} cards={roundCards.length} act={act} />}

        {room.status === "writing" && (
          <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-xl border border-[#f7d57a]/25 bg-[#24120e]/70 p-5 sm:p-6">
              <p className="font-display text-sm font-black uppercase tracking-[0.2em] text-[#f7d57a]">Your hand</p>
              <h2 className="mt-2 max-w-xl text-3xl font-black leading-tight text-[#f7f0d9]">Write it on a card, then fold it onto the felt.</h2>
              <p className="mt-3 max-w-xl text-[#e8d8ad]">The message stays hidden until the host reveals the round. Keep adding cards as long as you have ideas.</p>
            </div>

            <article ref={composerRef} className="playing-card relative min-h-[19rem] p-4 text-[#19100d] shadow-2xl">
              <CardCorners card={me} />
              <div className="flex h-full flex-col rounded-md border border-[#19100d]/15 p-4">
                <label className="text-center text-xs font-black uppercase tracking-[0.2em] text-[#9e1928]" htmlFor="answer">Your next card</label>
                <textarea id="answer" value={answer} maxLength={100} onChange={(event) => setAnswer(event.target.value)} className="mt-5 min-h-24 flex-1 resize-none bg-transparent text-center font-display text-3xl font-black leading-tight outline-none placeholder:text-[#19100d]/35" placeholder="Write an idea" />
                <button onClick={submitAnswer} disabled={!answer.trim() || isFolding} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#9e1928] px-4 font-black text-[#fff9e9] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45">
                  <FoldVertical size={18} /> {isFolding ? "Folding" : "Fold to table"}
                </button>
              </div>
            </article>
          </section>
        )}

        {room.status === "revealed" && (
          <section ref={revealRef} className="mt-12">
            <div className="max-w-3xl">
              <p className="font-display text-sm font-black uppercase tracking-[0.2em] text-[#f7d57a]">Matching piles</p>
              <h2 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.75rem)] font-black leading-[0.92] text-[#f7f0d9]">
                {"Here is where the ideas meet.".split(" ").map((word) => <span key={word} className="scrub-word opacity-20">{word} </span>)}
              </h2>
            </div>
            <div className="mt-8 space-y-5">
              {groups.map((group, index) => (
                <motion.article key={group.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, type: "spring", stiffness: 180, damping: 20 }} className="reveal-card casino-table-rail min-w-0 p-3">
                  <div className="casino-felt min-w-0 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-display text-3xl font-black capitalize text-[#f7f0d9]">{group.label}</h3>
                      <span className="rounded-full bg-[#f7d57a] px-3 py-1 text-sm font-black text-[#19100d]">{group.cards.length} cards</span>
                    </div>
                    <div className="relative mt-5">
                      <div className="match-card-grid">
                      {group.cards.map((card) => <PlayingCard key={card.id} text={card.text} card={card.participant} />)}
                      </div>
                      <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
                        <span aria-hidden="true" className="grid h-[120px] w-[120px] place-items-center rounded-full border-[6px] border-[#f7f0d9] bg-[#19100d] text-3xl font-black text-[#19100d] shadow-[0_9px_0_#9e1928]"><span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-[#f7f0d9]">{room.voteCounts[group.id] ?? 0}</span></span>
                        <button type="button" onClick={() => voteForGroup(group.id)} aria-label={`Vote for ${group.label} group; ${room.voteCounts[group.id] ?? 0} ${(room.voteCounts[group.id] ?? 0) === 1 ? "vote" : "votes"}`} aria-pressed={room.viewer.votedGroupId === group.id} className="min-h-14 whitespace-nowrap rounded-full border-2 border-[#f7d57a] bg-[#62e7ef] px-9 font-display text-xl font-black text-[#19100d] shadow-[0_8px_0_#9e1928,0_0_28px_rgba(98,231,239,0.7)] transition-transform duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#fff1b8]">{room.viewer.votedGroupId === group.id ? "Voted" : "Tap to Vote"}</button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        )}

        {error && <p className="mt-4 rounded-lg border border-red-200/25 bg-red-950/55 p-3 text-sm text-red-100">{error}</p>}
      </section>
    </Shell>
  );
}

function DealerControls({ room, cards, act }: { room: RoomView; cards: number; act: (payload: Record<string, unknown>) => Promise<RoomView | null> }) {
  const [prompt, setPrompt] = useState(room.prompt);

  return (
    <section className="mt-6 rounded-xl border border-[#f7d57a]/25 bg-[#24120e]/70 p-5 sm:p-6">
      <p className="font-display text-sm font-black uppercase tracking-[0.2em] text-[#f7d57a]">Dealer controls</p>
      <label className="mt-4 block text-sm font-bold text-[#e8d8ad]" htmlFor="prompt">Prompt</label>
      <textarea id="prompt" disabled={room.status !== "waiting"} value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-[#f7d57a]/20 bg-[#f7f0d9] px-4 py-3 font-bold text-[#19100d] outline-none disabled:opacity-70" placeholder="Where should we eat tonight?" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button disabled={!prompt.trim() || room.status !== "waiting"} onClick={() => act({ action: "patch", patch: { prompt, status: "writing" } })} className="min-h-12 rounded-lg bg-[#f7d57a] font-black text-[#19100d] disabled:opacity-40">Deal</button>
        <button disabled={!cards || room.status !== "writing"} onClick={() => act({ action: "patch", patch: { status: "revealed" } })} className="min-h-12 rounded-lg bg-[#9e1928] font-black text-[#fff9e9] disabled:opacity-40">Reveal</button>
        <button onClick={() => act({ action: "patch", patch: { newRound: true } })} className="grid min-h-12 place-items-center rounded-lg border border-[#f7d57a]/35 text-[#f7f0d9] transition-colors hover:bg-[#3a1b13]" aria-label="Start a new round"><RefreshCw /></button>
      </div>
    </section>
  );
}

function Shell({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden text-[#f7f0d9]">
      <nav className="table-nav fixed top-4 z-40 flex items-center justify-between border border-[#f7d57a]/30 bg-[#21110d]/85 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <a href="/" className="font-display font-black uppercase tracking-[0.12em] text-[#f7f0d9]"><MatchDeckLogo wordmark /></a>
        <span className="bg-[#f7d57a] px-3 py-1 text-sm font-black text-[#19100d]">{code}</span>
      </nav>
      {children}
    </main>
  );
}

function Message({ text }: { text: string }) {
  return (
    <section className="grid min-h-screen place-items-center px-5">
      <div className="casino-table-rail max-w-md p-3">
        <div className="casino-felt p-7 text-center">
          <Sparkles className="mx-auto text-[#f7d57a]" />
          <p className="mt-4 text-2xl font-black text-[#f7f0d9]">{text}</p>
          <a className="mt-5 inline-grid min-h-12 place-items-center rounded-lg bg-[#f7d57a] px-5 font-black text-[#19100d]" href="/">Home</a>
        </div>
      </div>
    </section>
  );
}

function CardBack({ index }: { index: number }) {
  const rotations = [-5, 3, -2, 5, -4, 2, 4, -3];
  return (
    <article className="card-back aspect-[5/7] min-w-0 shadow-xl transition-transform duration-500 hover:z-10 hover:scale-105" style={{ transform: `rotate(${rotations[index % rotations.length]}deg)` }} aria-label={`Folded card ${index + 1}`}>
      <div className="card-back-inner grid h-full place-items-center">
        <MatchDeckLogo className="text-[#f7d57a]" />
      </div>
    </article>
  );
}

function PlayingCard({ text, card }: { text: string; card: PublicParticipant }) {
  const className = "playing-card relative aspect-[5/7] min-w-0 p-3 text-[#19100d] shadow-xl";
  const contents = <>
    <CardCorners card={card} />
    <div className="grid h-full place-items-center rounded-md border border-[#19100d]/15 bg-[radial-gradient(circle_at_center,rgba(247,213,122,.3),transparent_48%)] px-3 text-center">
      <div>
        <p className="break-words font-display text-2xl font-black leading-none sm:text-3xl">{text}</p>
      </div>
    </div>
  </>;
  return (
    <article className={className}>{contents}</article>
  );
}

function CardCorners({ card }: { card: Pick<PublicParticipant, "cardRank" | "cardSuit"> }) {
  const red = card.cardSuit === "♥" || card.cardSuit === "♦";
  const color = red ? "text-[#9e1928]" : "text-[#19100d]";
  return (
    <>
      <div className={`absolute left-3 top-2 text-center font-black leading-none ${color}`}><div>{card.cardRank}</div><div className="text-sm">{card.cardSuit}</div></div>
      <div className={`absolute bottom-2 right-3 rotate-180 text-center font-black leading-none ${color}`}><div>{card.cardRank}</div><div className="text-sm">{card.cardSuit}</div></div>
    </>
  );
}

function playerCardLabel(participant: Pick<PublicParticipant, "cardRank" | "cardSuit">) {
  return `${participant.cardRank}${participant.cardSuit}`;
}
