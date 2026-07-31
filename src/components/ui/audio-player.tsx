'use client';

import { useState, useEffect, useRef } from 'react';

interface Track {
  name: string;
  url: string;
  filename: string;
}

export function AudioPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function fetchTracks() {
      try {
        const res = await fetch('/api/music');
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks);
        }
      } catch {
        // silent fail
      }
    }
    fetchTracks();
  }, []);

  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }

  function handleEnded() {
    if (tracks.length === 0) return;
    // Loop playlist automatically
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentIndex(nextIndex);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 100);
  }

  function playTrack(index: number) {
    setCurrentIndex(index);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 100);
  }

  if (tracks.length === 0) return null;

  return (
    <div className="relative">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Control Bar Button */}
      <div className="flex items-center gap-2 rounded-lg border border-brass/30 bg-gunmetal/90 px-3 py-1.5 shadow-lg">
        <button
          onClick={togglePlay}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-brass text-midnight hover:scale-105 transition-transform"
          title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}
        >
          {isPlaying ? (
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 max-w-[120px] md:max-w-[160px]">
          <p className="text-[11px] font-mono font-semibold text-white truncate" title={currentTrack?.name}>
            🎵 {currentTrack?.name}
          </p>
        </div>

        {/* Volume slider */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-12 h-1 accent-brass cursor-pointer hidden sm:block"
          title={`Âm lượng: ${Math.round(volume * 100)}%`}
        />

        {/* Playlist Toggle Button */}
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className={`rounded p-1 text-xs transition-colors ${
            showPlaylist ? 'text-brass bg-brass/10' : 'text-ash hover:text-white'
          }`}
          title="Danh sách nhạc"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
          </svg>
        </button>
      </div>

      {/* Playlist Popover */}
      {showPlaylist && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-white/[0.08] bg-gunmetal/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
            <span className="text-xs font-display font-semibold text-brass">Danh sách nhạc ({tracks.length})</span>
            <span className="text-[10px] text-ash/60">Lặp lại phát</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {tracks.map((track, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={track.url}
                  onClick={() => playTrack(idx)}
                  className={`w-full text-left flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-brass/20 text-brass font-semibold'
                      : 'text-ash hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">{idx + 1}. {track.name}</span>
                  {isSelected && isPlaying && (
                    <span className="text-[10px] animate-pulse">▶</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
