import React from 'react';
import MarkIcon from './MarkIcon.jsx';

export default function NormalBoard({ game, onMove, canPlay }) {
  const winSet = new Set(game?.winLine || []);

  return (
    <div className="normal-board-wrap">
      <div className="normal-board" role="grid" aria-label="Normal 3 by 3 Tic Tac Toe board">
        {(game?.board || Array(9).fill(null)).map((val, idx) => {
          const isWinCell = winSet.has(idx);
          const isLast = game?.lastMove?.cellIndex === idx;
          const clickable = canPlay && val === null && !game?.winner && !game?.isDraw;
          return (
            <button
              key={idx}
              type="button"
              className={`normal-cell ${isWinCell ? 'winning' : ''} ${isLast ? 'last-move' : ''}`}
              onClick={() => clickable && onMove({ cellIndex: idx })}
              disabled={!clickable}
              aria-label={`Cell ${idx + 1}${val ? `, occupied by ${val}` : ', empty'}`}
            >
              <MarkIcon symbol={val} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
