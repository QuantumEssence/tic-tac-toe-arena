import React from 'react';
import { Crown, Trophy, Play, Eye, RefreshCw, Flame } from 'lucide-react';

function SlotCard({ slot, players, matches, myPlayerId, isLocal, onOpenMatch }) {
  if (!slot) return null;
  const pX = slot.playerXId ? players[slot.playerXId] : null;
  const pO = slot.playerOId ? players[slot.playerOId] : null;
  const match = slot.matchId ? matches?.[slot.matchId] : null;
  const winner = slot.winnerId ? players[slot.winnerId] : null;
  const isParticipant =
    isLocal || myPlayerId === slot.playerXId || myPlayerId === slot.playerOId;

  return (
    <div className={`bracket-slot ${slot.status === 'active' ? 'live' : ''}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="font-display" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            {slot.round}
          </span>
          {slot.rematchCount > 0 && (
            <span className="badge badge-amber">
              <Flame size={11} /> Sudden Death #{slot.rematchCount}
            </span>
          )}
        </div>
        <span
          className={`badge ${
            slot.status === 'completed'
              ? 'badge-emerald'
              : slot.status === 'active'
                ? 'badge-gold'
                : ''
          }`}
        >
          {slot.status === 'completed'
            ? 'Finished'
            : slot.status === 'active'
              ? 'Live'
              : 'Waiting'}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '6px', marginBottom: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: '9px',
            background:
              slot.winnerId && slot.winnerId === slot.playerXId
                ? 'rgba(16, 185, 129, 0.14)'
                : 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-x">X</span>
            <span style={{ fontWeight: 600 }}>{pX ? pX.name : 'TBD'}</span>
            {slot.seedA && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                #{slot.seedA}
              </span>
            )}
          </div>
          {winner && winner.id === slot.playerXId && <Crown size={15} color="var(--gold)" />}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 10px',
            borderRadius: '9px',
            background:
              slot.winnerId && slot.winnerId === slot.playerOId
                ? 'rgba(16, 185, 129, 0.14)'
                : 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-o">O</span>
            <span style={{ fontWeight: 600 }}>{pO ? pO.name : 'TBD'}</span>
            {slot.seedB && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                #{slot.seedB}
              </span>
            )}
          </div>
          {winner && winner.id === slot.playerOId && <Crown size={15} color="var(--gold)" />}
        </div>
      </div>

      {match && (
        <button
          type="button"
          className={`btn btn-sm ${
            slot.status === 'active' && isParticipant ? 'btn-gold' : ''
          }`}
          style={{ width: '100%' }}
          onClick={() => onOpenMatch(match.id)}
        >
          {slot.status === 'active' ? (
            isParticipant ? (
              <>
                <Play size={14} /> Play Match
              </>
            ) : (
              <>
                <Eye size={14} /> Spectate Match
              </>
            )
          ) : (
            <>
              <Eye size={14} /> View Result
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function FinalsBracket({
  finals,
  players,
  matches,
  myPlayerId,
  isHost,
  isLocal,
  onOpenMatch,
  onNewSeason,
}) {
  if (!finals) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="var(--gold)" />
            <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
              Championship Finals
            </h3>
          </div>
          <span className="badge">League In Progress</span>
        </div>
        <div className="panel-body" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Players are battling in the Endless League to climb the leaderboard. When ready, the Host can launch the Top 2 or Top 4 Championship Finals at any time.
        </div>
      </div>
    );
  }

  const champion = finals.championId ? players[finals.championId] : null;
  const slots = finals.slots || {};

  return (
    <div className="panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} color="var(--gold)" />
          <h3 className="font-display" style={{ fontSize: '1.05rem' }}>
            Championship Finals
          </h3>
        </div>
        <span className={`badge ${finals.difficulty === 'expert' ? 'badge-gold' : 'badge-x'}`}>
          {finals.difficulty === 'expert' ? 'Expert 9×9' : 'Normal 3×3'}
        </span>
      </div>

      <div className="panel-body">
        {champion && (
          <div className="champion-banner">
            <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', background: 'var(--gold-tint)', marginBottom: '8px' }}>
              <Crown size={28} color="var(--gold)" />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)' }}>
              Tournament Champion
            </div>
            <h2 className="font-display" style={{ fontSize: '1.65rem', marginTop: '4px' }}>
              {champion.name}
            </h2>
            <p style={{ margin: '6px 0 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {champion.wins} Wins ({champion.normalWins} Normal · {champion.expertWins} Expert)
            </p>
            {(isHost || isLocal) && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={() => onNewSeason(true)}
                >
                  <RefreshCw size={14} /> New Season (Reset Wins)
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onNewSeason(false)}
                >
                  Back to Endless League
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bracket-grid">
          {finals.size === 4 && (
            <>
              <SlotCard
                slot={slots.sf1}
                players={players}
                matches={matches}
                myPlayerId={myPlayerId}
                isLocal={isLocal}
                onOpenMatch={onOpenMatch}
              />
              <SlotCard
                slot={slots.sf2}
                players={players}
                matches={matches}
                myPlayerId={myPlayerId}
                isLocal={isLocal}
                onOpenMatch={onOpenMatch}
              />
            </>
          )}
          <SlotCard
            slot={slots.final}
            players={players}
            matches={matches}
            myPlayerId={myPlayerId}
            isLocal={isLocal}
            onOpenMatch={onOpenMatch}
          />
        </div>
      </div>
    </div>
  );
}
