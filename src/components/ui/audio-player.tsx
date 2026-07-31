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

  // Autoplay when tracks loaded or track index changes
  useEffect(() => {
    if (tracks.length > 0 && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Browser autoplay policy might require first user click
            setIsPlaying(false);

            const handleFirstInteraction = () => {
              if (audioRef.current) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
              window.removeEventListener('click', handleFirstInteraction);
              window.removeEventListener('keydown', handleFirstInteraction);
            };

            window.addEventListener('click', handleFirstInteraction);
            window.addEventListener('keydown', handleFirstInteraction);
          });
      }
    }
  }, [tracks, currentIndex]);

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
    <div className="fixed right-4 bottom-6 z-50">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Compact Dock Control Button */}
      <button
        onClick={togglePlay}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowPlaylist(!showPlaylist);
        }}
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
          isPlaying
            ? 'border-brass/60 bg-brass/20 text-brass shadow-brass/20 animate-pulse'
            : 'border-white/[0.08] bg-gunmetal/90 text-ash hover:text-white hover:border-brass/30'
        }`}
        title={isPlaying ? `Đang phát: ${currentTrack?.name} (Click phải để xem ds nhạc)` : 'Phát nhạc nền (Click phải để xem ds nhạc)'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" opacity="0.5" />
          </svg>
        )}
      </button>

      {/* Playlist Popover */}
      {showPlaylist && (
        <div className="absolute right-14 bottom-0 z-50 w-64 rounded-xl border border-white/[0.08] bg-gunmetal/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
            <span className="text-xs font-display font-semibold text-brass">Danh sách nhạc ({tracks.length})</span>
            <button onClick={() => setShowPlaylist(false)} className="text-ash hover:text-white text-xs">✕</button>
          </div>
          <div className="mb-2">
            <label className="text-[10px] text-ash block mb-1">Âm lượng: {Math.round(volume * 100)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1 accent-brass cursor-pointer"
            />
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
