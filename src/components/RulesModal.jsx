import React from 'react';
import { X, Trophy, Grid3X3, RotateCcw, Swords } from 'lucide-react';

export default function RulesModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Game Rules">
      <div className="panel modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2 className="font-display" style={{ fontSize: '1.25rem' }}>
            Arena Rules &amp; Format
          </h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close rules">
            <X size={18} />
          </button>
        </div>
        <div className="panel-body" style={{ display: 'grid', gap: '16px', fontSize: '0.9rem', lineHeight: 1.55 }}>
          <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--x-color)', marginBottom: '4px' }}>
              <Grid3X3 size={16} /> Normal Difficulty (3×3)
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Classic fast-paced 3×3 Tic-Tac-Toe. First to align 3 marks horizontally, vertically, or diagonally claims the win.
            </p>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255, 183, 3, 0.08)', border: '1px solid rgba(255, 183, 3, 0.28)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--gold)', marginBottom: '6px' }}>
              <Swords size={16} /> Expert Difficulty — Free-Choice Nested 3×3
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', display: 'grid', gap: '6px' }}>
              <li>Each cell in the main 3×3 macro board contains its own 3×3 mini-board (81 squares total).</li>
              <li><strong>Free-Choice Movement:</strong> Play in <em>any</em> open cell of <em>any</em> un-won mini-board on every turn.</li>
              <li><strong>Claiming Macro Cells:</strong> Winning a mini-board places your X or O over that entire macro cell.</li>
              <li>
                <strong style={{ color: 'var(--amber)' }}><RotateCcw size={13} style={{ verticalAlign: 'middle' }} /> Auto-Reset on Draws:</strong>{' '}
                If a mini-board fills up with no winner, it flashes <code>DRAW • RESET</code> and clears itself so players keep contesting that cell until someone wins it!
              </li>
              <li>First player to align 3 claimed macro cells wins the match.</li>
            </ul>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--emerald)', marginBottom: '6px' }}>
              <Trophy size={16} /> Endless League + On-Demand Championship Finals
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', display: 'grid', gap: '6px' }}>
              <li><strong>Endless League:</strong> Up to 16 players (humans + AI Bots) play as many matches as they want via Quick Match or direct Challenges to rack up Total Wins.</li>
              <li><strong>Configurable Difficulty:</strong> Rooms can allow Normal/Expert per match or lock League to Normal/Expert, while Championship Finals default to Expert (or Normal).</li>
              <li><strong>On-Demand Finals:</strong> Whenever ready, the Host launches Top 2 (Grand Final) or Top 4 (Semis + Final) Playoffs. Draws in Finals trigger automatic Sudden-Death rematches swapping X &amp; O!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
