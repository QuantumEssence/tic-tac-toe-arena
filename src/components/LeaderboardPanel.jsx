import React from 'react';
import { Trophy, Flame, Bot, Crown } from 'lucide-react';
import { rankPlayers } from '../engine/tournamentLogic.js';

export default function LeaderboardPanel({
  players,
  myPlayerId,
  hostId,
  championId,
  finalsCutoff = 2,
}) {
  const ranked = rankPlayers(players);

  return (
    <div className="panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} color="var(--gold)" />
          <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
            Live Standings
          </h3>
        </div>
        <span className="badge badge-gold">Ranked by Wins</span>
      </div>

      <div className="panel-body">
        <div className="standings-header">
          <span>#</span>
          <span>Player</span>
          <span style={{ textAlign: 'right' }}>Wins</span>
          <span className="col-split" style={{ textAlign: 'right' }}>N / E</span>
          <span style={{ textAlign: 'right' }}>W-D-L</span>
        </div>

        <div className="standings-list">
          {ranked.map((p, idx) => {
            const isSeed = idx < finalsCutoff;
            const showCutoffAfter =
              ranked.length > finalsCutoff && idx === finalsCutoff - 1;

            return (
              <React.Fragment key={p.id}>
                <div
                  className={`standing-row ${isSeed ? 'top-seed' : ''} ${
                    p.id === myPlayerId ? 'is-me' : ''
                  }`}
                >
                  <span
                    className="font-mono"
                    style={{
                      fontWeight: 700,
                      color: idx === 0 ? 'var(--gold)' : 'var(--text-secondary)',
                    }}
                  >
                    {idx === 0 && championId === p.id ? (
                      <Crown size={15} color="var(--gold)" />
                    ) : (
                      `#${p.rank}`
                    )}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div
                      className="avatar avatar-sm"
                      style={{ backgroundColor: p.color || '#00F0FF' }}
                    >
                      {p.isBot ? <Bot size={14} /> : p.name.slice(0, 1).toUpperCase()}
                      {!p.isBot && (
                        <span className={`presence-dot ${p.online ? '' : 'offline'}`} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span>{p.name}</span>
                        {p.id === hostId && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>HOST</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <span>{p.winRate}% WR</span>
                        <span className="mobile-split-sub">
                          · {p.normalWins}N/{p.expertWins}E
                        </span>
                        {p.streak >= 2 && (
                          <span style={{ color: '#fb923c', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Flame size={11} /> {p.streak}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className="font-mono"
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: p.wins > 0 ? 'var(--x-color)' : 'var(--text-secondary)',
                    }}
                  >
                    {p.wins}
                  </span>

                  <span
                    className="font-mono col-split"
                    style={{ textAlign: 'right', fontSize: '0.76rem', color: 'var(--text-secondary)' }}
                    title="Normal Wins / Expert Wins"
                  >
                    {p.normalWins}/{p.expertWins}
                  </span>

                  <span
                    className="font-mono"
                    style={{ textAlign: 'right', fontSize: '0.76rem', color: 'var(--text-secondary)' }}
                  >
                    {p.wins}-{p.draws}-{p.losses}
                  </span>
                </div>

                {showCutoffAfter && (
                  <div className="cutoff-divider">
                    <span>Top {finalsCutoff} Finals Cutoff</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
