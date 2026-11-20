import React, { useState } from 'react';
import {
  Globe,
  Smartphone,
  HelpCircle,
  Volume2,
  VolumeX,
  Plus,
  Users,
  ArrowRight,
  Trophy,
  Trash2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { AVATAR_COLORS } from '../engine/tournamentLogic.js';

export const APK_DOWNLOAD_URL =
  'https://github.com/QuantumEssence/tic-tac-toe-arena/releases/latest/download/TicTacToe-Arena-debug.apk';

export default function LandingHub({
  profile,
  onUpdateProfile,
  publicRooms,
  savedLocalTournament,
  onCreateOnline,
  onJoinOnline,
  onStartLocal,
  onResumeLocal,
  onDiscardLocal,
  onOpenRules,
  muted,
  onToggleSound,
  busy,
  error,
}) {
  const [modeTab, setModeTab] = useState('online');
  const [joinCode, setJoinCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [leagueDiff, setLeagueDiff] = useState('selectable');
  const [finalsDiff, setFinalsDiff] = useState('expert');
  const [turnTimer, setTurnTimer] = useState(0);
  const [isPublic, setIsPublic] = useState(true);

  // Local Pass-and-Play builder
  const [localName, setLocalName] = useState('Pass & Play Cup');
  const [localPlayers, setLocalPlayers] = useState([
    { name: profile.name || 'Player 1', color: profile.color || AVATAR_COLORS[0] },
    { name: 'Player 2', color: AVATAR_COLORS[1] },
  ]);
  const [localBotCount, setLocalBotCount] = useState(1);
  const [localBotSkill, setLocalBotSkill] = useState('smart');
  const [localLeagueDiff, setLocalLeagueDiff] = useState('selectable');
  const [localFinalsDiff, setLocalFinalsDiff] = useState('expert');

  const isNativeAndroid =
    typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());

  const handleCreateOnlineSubmit = (e) => {
    e.preventDefault();
    onCreateOnline({
      roomName: roomName.trim() || `${profile.name}'s Arena`,
      leagueDifficulty: leagueDiff,
      finalsDifficulty: finalsDiff,
      turnTimerSec: turnTimer,
      isPublic,
    });
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinOnline(joinCode.trim());
  };

  const handleCreateLocalSubmit = (e) => {
    e.preventDefault();
    const cleaned = localPlayers
      .map((p, idx) => ({
        name: p.name.trim() || `Player ${idx + 1}`,
        color: p.color,
      }))
      .slice(0, 16);

    onStartLocal({
      name: localName.trim() || 'Pass & Play Cup',
      humanPlayers: cleaned,
      botCount: localBotCount,
      botSkill: localBotSkill,
      leagueDifficulty: localLeagueDiff,
      finalsDifficulty: localFinalsDiff,
    });
  };

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <img
            src="/favicon.svg"
            alt="Tic Tac Toe Arena logo"
            style={{ width: '42px', height: '42px', borderRadius: '11px' }}
          />
          <div>
            <h1 className="brand-title">TIC TAC TOE ARENA</h1>
            <div className="brand-sub">ENDLESS LEAGUE · EXPERT 9×9 · FINALS</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm" onClick={onOpenRules}>
            <HelpCircle size={15} /> Rules
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onToggleSound}
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          {!isNativeAndroid && (
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-gold"
            >
              <Download size={15} /> Android APK
            </a>
          )}
        </div>
      </header>

      {/* Hero Banner */}
      <div className="panel hero-banner">
        <div style={{ maxWidth: '720px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className="badge badge-x">Normal 3×3</span>
            <span className="badge badge-gold">Expert Free-Choice 9×9 + Auto-Reset</span>
            <span className="badge badge-emerald">Cross-Play Web &amp; Android</span>
          </div>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.2rem, 2.3vw, 1.65rem)' }}>
            Host multi-player tournaments, stack wins, and launch Championship Finals on demand.
          </h2>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '18px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(255, 77, 109, 0.14)',
            border: '1px solid rgba(255, 77, 109, 0.45)',
            color: '#ffb3c1',
            fontWeight: 600,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="landing-grid">
        {/* Left: Instant Nickname & Avatar Profile */}
        <aside className="panel">
          <div className="panel-header">
            <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
              Your Fighter Tag
            </h3>
            <span className="badge badge-x">No Sign-Up</span>
          </div>
          <div className="panel-body" style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                className="avatar avatar-lg"
                style={{ backgroundColor: profile.color || AVATAR_COLORS[0] }}
              >
                {(profile.name || 'P').slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label" htmlFor="nickname-input">
                  Nickname
                </label>
                <input
                  id="nickname-input"
                  type="text"
                  className="input"
                  maxLength={18}
                  placeholder="Enter nickname"
                  value={profile.name}
                  onChange={(e) => onUpdateProfile({ name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <span className="field-label">Avatar Color</span>
              <div className="swatch-row">
                {AVATAR_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`swatch ${profile.color === hex ? 'selected' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => onUpdateProfile({ color: hex })}
                    aria-label={`Select color ${hex}`}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(7, 11, 20, 0.5)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Play immediately with zero login. Share any 5-character Room Code or link to battle friends across PC browsers and Android phones in the same tournament!
            </div>
          </div>
        </aside>

        {/* Right: Online vs Local Tournament Controls */}
        <main className="panel">
          <div className="panel-body">
            <div className="mode-tabs">
              <button
                type="button"
                className={`btn ${modeTab === 'online' ? 'btn-primary' : ''}`}
                onClick={() => setModeTab('online')}
              >
                <Globe size={16} /> Online Arena
              </button>
              <button
                type="button"
                className={`btn ${modeTab === 'local' ? 'btn-primary' : ''}`}
                onClick={() => setModeTab('local')}
              >
                <Smartphone size={16} /> Local Pass &amp; Play
              </button>
            </div>

            {modeTab === 'online' ? (
              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Join via Code */}
                <form
                  onSubmit={handleJoinSubmit}
                  style={{
                    padding: '15px',
                    borderRadius: '14px',
                    background: 'rgba(7, 11, 20, 0.55)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <label className="field-label" htmlFor="join-room-code">
                    Join with Room Code
                  </label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      id="join-room-code"
                      type="text"
                      className="input font-mono"
                      style={{ flex: '1 1 180px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}
                      placeholder="e.g. X7K9P"
                      maxLength={8}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={busy || !joinCode.trim()}
                    >
                      Join Room <ArrowRight size={16} />
                    </button>
                  </div>
                </form>

                {/* Create Online Tournament */}
                <form
                  onSubmit={handleCreateOnlineSubmit}
                  style={{
                    display: 'grid',
                    gap: '14px',
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'rgba(7, 11, 20, 0.55)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
                      Host New Online Tournament
                    </h3>
                    <span className="badge badge-gold">Endless League + Finals</span>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="online-room-name">
                      Tournament Name
                    </label>
                    <input
                      id="online-room-name"
                      type="text"
                      className="input"
                      placeholder={`${profile.name || 'Player'}'s Arena`}
                      maxLength={32}
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                    />
                  </div>

                  <div>
                    <span className="field-label">League Match Difficulty</span>
                    <div className="seg-group" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <button
                        type="button"
                        className={`seg-btn ${leagueDiff === 'selectable' ? 'active cyan' : ''}`}
                        onClick={() => setLeagueDiff('selectable')}
                      >
                        Selectable
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${leagueDiff === 'normal' ? 'active cyan' : ''}`}
                        onClick={() => setLeagueDiff('normal')}
                      >
                        All Normal 3×3
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${leagueDiff === 'expert' ? 'active gold' : ''}`}
                        onClick={() => setLeagueDiff('expert')}
                      >
                        All Expert 9×9
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                    <div>
                      <span className="field-label">Championship Finals</span>
                      <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <button
                          type="button"
                          className={`seg-btn ${finalsDiff === 'expert' ? 'active gold' : ''}`}
                          onClick={() => setFinalsDiff('expert')}
                        >
                          Expert 9×9
                        </button>
                        <button
                          type="button"
                          className={`seg-btn ${finalsDiff === 'normal' ? 'active cyan' : ''}`}
                          onClick={() => setFinalsDiff('normal')}
                        >
                          Normal 3×3
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="field-label">Turn Timer</span>
                      <div className="seg-group" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {[0, 15, 30, 60].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            className={`seg-btn ${turnTimer === sec ? 'active cyan' : ''}`}
                            onClick={() => setTurnTimer(sec)}
                          >
                            {sec === 0 ? 'Off' : `${sec}s`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="field-label">Room Visibility</span>
                    <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <button
                        type="button"
                        className={`seg-btn ${isPublic ? 'active cyan' : ''}`}
                        onClick={() => setIsPublic(true)}
                      >
                        Public Lobby (Listed)
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${!isPublic ? 'active cyan' : ''}`}
                        onClick={() => setIsPublic(false)}
                      >
                        Private (Code Only)
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-gold" disabled={busy}>
                    <Trophy size={16} /> {busy ? 'Creating Room...' : 'Create Online Tournament'}
                  </button>
                </form>

                {/* Live Public Rooms Browser */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 className="font-display" style={{ fontSize: '1.02rem' }}>
                      Live Public Arenas ({publicRooms.length})
                    </h3>
                    <span className="badge badge-emerald">Realtime</span>
                  </div>

                  {publicRooms.length === 0 ? (
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px dashed var(--border-subtle)',
                        color: 'var(--text-muted)',
                        fontSize: '0.86rem',
                        textAlign: 'center',
                      }}
                    >
                      No active public rooms right now — create one above or enter a private code!
                    </div>
                  ) : (
                    <div className="room-list">
                      {publicRooms.map((r) => (
                        <div key={r.code} className="room-row">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{r.name}</span>
                              <span className="badge font-mono">{r.code}</span>
                              <span className={`badge ${r.status === 'finals' ? 'badge-gold' : 'badge-emerald'}`}>
                                {r.status === 'finals' ? 'Finals' : 'League'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Host: {r.hostName} · <Users size={12} style={{ verticalAlign: 'middle' }} /> {r.playerCount}/16 ·{' '}
                              League: {r.leagueDifficulty} · Finals: {r.finalsDifficulty}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => onJoinOnline(r.code)}
                          >
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Local Pass-and-Play Builder */
              <div style={{ display: 'grid', gap: '18px' }}>
                {savedLocalTournament && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '14px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        Saved Offline Tournament: {savedLocalTournament.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Season {savedLocalTournament.season} ·{' '}
                        {Object.keys(savedLocalTournament.players || {}).length} players ·{' '}
                        {(savedLocalTournament.history || []).length} matches completed
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={onResumeLocal}
                      >
                        <RefreshCw size={14} /> Resume
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={onDiscardLocal}
                      >
                        <Trash2 size={14} /> Discard
                      </button>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleCreateLocalSubmit}
                  style={{
                    display: 'grid',
                    gap: '14px',
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'rgba(7, 11, 20, 0.55)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
                      New Offline Pass &amp; Play Tournament
                    </h3>
                    <span className="badge badge-amber">Works Without Internet</span>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="local-name">
                      Tournament Title
                    </label>
                    <input
                      id="local-name"
                      type="text"
                      className="input"
                      maxLength={32}
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="field-label" style={{ marginBottom: 0 }}>
                        Human Players ({localPlayers.length})
                      </span>
                      {localPlayers.length < 14 && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() =>
                            setLocalPlayers((prev) => [
                              ...prev,
                              {
                                name: `Player ${prev.length + 1}`,
                                color: AVATAR_COLORS[prev.length % AVATAR_COLORS.length],
                              },
                            ])
                          }
                        >
                          <Plus size={14} /> Add Player
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                      {localPlayers.map((lp, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div className="avatar avatar-sm" style={{ backgroundColor: lp.color }}>
                            {idx + 1}
                          </div>
                          <input
                            type="text"
                            className="input"
                            maxLength={18}
                            value={lp.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLocalPlayers((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                              );
                            }}
                          />
                          {localPlayers.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() =>
                                setLocalPlayers((prev) => prev.filter((_, i) => i !== idx))
                              }
                              aria-label={`Remove player ${idx + 1}`}
                            >
                              <Trash2 size={14} color="#ff8fa3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <span className="field-label">Add AI Bots</span>
                      <div className="seg-group" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        {[0, 1, 2, 3, 4].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            className={`seg-btn ${localBotCount === cnt ? 'active cyan' : ''}`}
                            onClick={() => setLocalBotCount(cnt)}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="field-label">Bot AI Skill</span>
                      <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <button
                          type="button"
                          className={`seg-btn ${localBotSkill === 'smart' ? 'active gold' : ''}`}
                          onClick={() => setLocalBotSkill('smart')}
                        >
                          Smart
                        </button>
                        <button
                          type="button"
                          className={`seg-btn ${localBotSkill === 'casual' ? 'active cyan' : ''}`}
                          onClick={() => setLocalBotSkill('casual')}
                        >
                          Casual
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="field-label">League Match Difficulty</span>
                    <div className="seg-group" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <button
                        type="button"
                        className={`seg-btn ${localLeagueDiff === 'selectable' ? 'active cyan' : ''}`}
                        onClick={() => setLocalLeagueDiff('selectable')}
                      >
                        Selectable
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${localLeagueDiff === 'normal' ? 'active cyan' : ''}`}
                        onClick={() => setLocalLeagueDiff('normal')}
                      >
                        All Normal
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${localLeagueDiff === 'expert' ? 'active gold' : ''}`}
                        onClick={() => setLocalLeagueDiff('expert')}
                      >
                        All Expert
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="field-label">Championship Finals</span>
                    <div className="seg-group" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <button
                        type="button"
                        className={`seg-btn ${localFinalsDiff === 'expert' ? 'active gold' : ''}`}
                        onClick={() => setLocalFinalsDiff('expert')}
                      >
                        Expert Nested 9×9
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${localFinalsDiff === 'normal' ? 'active cyan' : ''}`}
                        onClick={() => setLocalFinalsDiff('normal')}
                      >
                        Normal 3×3
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-gold"
                    disabled={localPlayers.length + localBotCount < 2}
                  >
                    <Trophy size={16} /> Start Local Tournament ({localPlayers.length + localBotCount} Players)
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
