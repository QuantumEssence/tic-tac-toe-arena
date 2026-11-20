import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import MarkIcon from './MarkIcon.jsx';

export default function ExpertBoard({ game, onMove, canPlay }) {
  const [zoomMode, setZoomMode] = useState(false);
  const [focusedBoard, setFocusedBoard] = useState(null);
  const [flashResetBoard, setFlashResetBoard] = useState(null);

  const lastResetBoard = game?.lastReset?.boardIndex ?? null;
  const lastResetAt = game?.lastReset?.at ?? null;
  const lastResetCount = game?.lastReset?.count ?? null;

  useEffect(() => {
    if (lastResetBoard === null || lastResetCount === null) return;
    if (lastResetAt && Date.now() - lastResetAt > 8000) return;
    setFlashResetBoard(lastResetBoard);
    const t = setTimeout(() => setFlashResetBoard(null), 1300);
    return () => clearTimeout(t);
  }, [lastResetBoard, lastResetAt, lastResetCount]);

  const macroBoard = game?.macroBoard || Array(9).fill(null);
  const miniBoards = game?.miniBoards || Array.from({ length: 9 }, () => Array(9).fill(null));
  const resetCounts = game?.resetCounts || Array(9).fill(0);
  const macroWinSet = new Set(game?.winLine || []);
  const matchEnded = Boolean(game?.winner || game?.isDraw);

  const handleCellPlay = (bIdx, cIdx) => {
    if (!canPlay || matchEnded) return;
    if (macroBoard[bIdx] !== null) return;
    if (miniBoards[bIdx][cIdx] !== null) return;
    onMove({ boardIndex: bIdx, cellIndex: cIdx });
  };

  return (
    <div className="expert-board-wrap">
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-gold">Free-Choice Nested 3×3</span>
          <span className="badge badge-amber">
            <RotateCcw size={12} /> Auto-Reset Draws
          </span>
        </div>

        <button
          type="button"
          className={`btn btn-sm ${zoomMode ? 'btn-primary' : ''}`}
          onClick={() => {
            setZoomMode((z) => !z);
            setFocusedBoard(null);
          }}
        >
          {zoomMode ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
          {zoomMode ? 'Exit Zoom Mode' : 'Tap-to-Zoom'}
        </button>
      </div>

      {zoomMode && focusedBoard !== null && macroBoard[focusedBoard] === null && (
        <div className="zoom-mini-stage">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-display" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Mini-Board #{focusedBoard + 1}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setFocusedBoard(null)}
            >
              Close Zoom
            </button>
          </div>
          <div className="zoom-mini-grid">
            {miniBoards[focusedBoard].map((cellVal, cIdx) => {
              const clickable = canPlay && !matchEnded && cellVal === null;
              return (
                <button
                  key={cIdx}
                  type="button"
                  className="zoom-mini-cell"
                  disabled={!clickable}
                  onClick={() => handleCellPlay(focusedBoard, cIdx)}
                  aria-label={`Zoom board ${focusedBoard + 1} cell ${cIdx + 1}`}
                >
                  <MarkIcon symbol={cellVal} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="expert-macro-grid" role="grid" aria-label="Expert 9 by 9 nested Tic Tac Toe board">
        {miniBoards.map((mini, bIdx) => {
          const macroOwner = macroBoard[bIdx];
          const isMacroWin = macroWinSet.has(bIdx);
          const isJustReset = flashResetBoard === bIdx;
          const resets = resetCounts[bIdx] || 0;
          const playable = canPlay && !matchEnded && macroOwner === null;

          const miniClasses = [
            'mini-board',
            playable ? 'playable' : '',
            macroOwner === 'X' ? 'won-x' : '',
            macroOwner === 'O' ? 'won-o' : '',
            isMacroWin ? 'macro-win' : '',
            isJustReset ? 'just-reset' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={bIdx}
              className={miniClasses}
              onClick={() => {
                if (zoomMode && macroOwner === null) {
                  setFocusedBoard(bIdx);
                }
              }}
            >
              {resets > 0 && !macroOwner && (
                <span className="mini-reset-pill" title={`Auto-reset ${resets} time(s)`}>
                  R{resets}
                </span>
              )}

              {isJustReset && !macroOwner && (
                <div className="mini-reset-banner">
                  <span>DRAW</span>
                  <span>RESET</span>
                </div>
              )}

              {mini.map((cellVal, cIdx) => {
                const isLast =
                  game?.lastMove?.boardIndex === bIdx && game?.lastMove?.cellIndex === cIdx;
                const cellPlayable = playable && cellVal === null && !zoomMode;
                return (
                  <button
                    key={cIdx}
                    type="button"
                    className={`mini-cell ${isLast ? 'last-cell' : ''}`}
                    disabled={!cellPlayable && !(zoomMode && macroOwner === null)}
                    onClick={(e) => {
                      if (zoomMode && macroOwner === null) {
                        e.stopPropagation();
                        setFocusedBoard(bIdx);
                        return;
                      }
                      handleCellPlay(bIdx, cIdx);
                    }}
                    aria-label={`Board ${bIdx + 1} cell ${cIdx + 1}${cellVal ? `, ${cellVal}` : ''}`}
                  >
                    <MarkIcon symbol={cellVal} />
                  </button>
                );
              })}

              {macroOwner && (
                <div className="mini-won-overlay" aria-label={`Mini-board ${bIdx + 1} won by ${macroOwner}`}>
                  <MarkIcon symbol={macroOwner} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
