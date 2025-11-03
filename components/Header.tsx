"use client";
import { useEffect, useRef, useState } from "react";

const Header = () => {
    const [isMuted, setIsMuted] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.loop = true;
        audioRef.current.volume = 0.35;
        audioRef.current.muted = true;
    }, []);

    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.muted = isMuted;
        if (isMuted) audioRef.current.pause();
    }, [isMuted]);

    const toggleMute = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isMuted) {
            try {
                audio.muted = false;
                await audio.play();
                setIsMuted(false);
            } catch {
                setIsMuted(true);
            }
        } else {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = true;
            setIsMuted(true);
        }
    };

    return (
        <header className="relative z-50 w-full border-b-4 border-black bg-gradient-to-r from-amber-300 via-orange-200 to-pink-200">
            <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.65),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.45),transparent_60%)]" />
            </div>

            <audio ref={audioRef} src="/flute.mpeg" preload="none" />

            <div className="relative mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-black sm:flex-nowrap">
                <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded-2xl border-4 border-black bg-white/80 px-4 py-2 shadow-[4px_4px_0px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                        <h1 className="text-2xl font-black uppercase tracking-tight">Sarathi</h1>
                    </div>
                    <span className="inline-flex items-center rounded-full border-2 border-black/30 bg-white/70 px-3 py-1 text-[0.55rem] font-black uppercase tracking-[0.3em] text-black/70 backdrop-blur">
                        Conversational AI Companion
                    </span>
                </div>

                <button
                    type="button"
                    onClick={toggleMute}
                    className={`flex items-center gap-2 rounded-full border-4 border-black px-4 py-2 text-[0.6rem] font-black uppercase tracking-[0.25em] text-black shadow-[4px_4px_0px_rgba(0,0,0,0.45)] transition-all duration-150 hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-none ${
                        isMuted ? "bg-white" : "bg-lime-300"
                    }`}
                >
                    <span className="text-xl">{isMuted ? "🔇" : "🎵"}</span>
                    <span>{isMuted ? "Muted" : "Playing"}</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
