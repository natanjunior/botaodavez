'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

type ButtonState = 'disabled' | 'countdown' | 'active' | 'eliminated' | 'completed';

export interface ReactionButtonProps {
  socket: Socket | null;
  roundId: string | null;
  participantId: string;
  onEliminated?: () => void;
  onReactionRecorded?: (reactionTime: number) => void;
}

/**
 * Reaction Button Component
 * Core game mechanic - participants click button to register reaction time
 *
 * Button States:
 * - disabled: Waiting for round to start (gray)
 * - countdown: Yellow button (clicking = elimination)
 * - active: Green button (click to register reaction time)
 * - eliminated: Red button (clicked too early)
 * - completed: Button disabled after successful click
 */
export function ReactionButton({
  socket,
  roundId,
  participantId,
  onEliminated,
  onReactionRecorded,
}: ReactionButtonProps) {
  const [buttonState, setButtonState] = useState<ButtonState>('disabled');
  const [countdownStartTime, setCountdownStartTime] = useState<number | null>(null);
  const [countdownDuration, setCountdownDuration] = useState<number | null>(null);
  const [greenStartTime, setGreenStartTime] = useState<number | null>(null);
  const [reactionTime, setReactionTime] = useState<number | null>(null);

  // Timer reference for countdown
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  // Listen for round events from Socket.io
  useEffect(() => {
    if (!socket) return;

    socket.on('round:started', (data) => {
      console.log('[ReactionButton] Round started:', data);

      if (data.round_id === roundId) {
        // Start countdown
        setButtonState('countdown');
        setCountdownDuration(data.countdown_duration);
        setCountdownStartTime(performance.now());

        // Set timer to change button to green after countdown
        countdownTimer.current = setTimeout(() => {
          setButtonState('active');
          setGreenStartTime(performance.now());
        }, data.countdown_duration);
      }
    });

    socket.on('round:cancelled', (data) => {
      console.log('[ReactionButton] Round cancelled:', data);

      if (data.round_id === roundId) {
        resetButton();
      }
    });

    socket.on('round:result', (data) => {
      console.log('[ReactionButton] Round result received:', data);

      if (data.round_id === roundId) {
        setButtonState('completed');
      }
    });

    return () => {
      socket.off('round:started');
      socket.off('round:cancelled');
      socket.off('round:result');
    };
  }, [socket, roundId]);

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimer.current) {
        clearTimeout(countdownTimer.current);
      }
    };
  }, []);

  const resetButton = () => {
    setButtonState('disabled');
    setCountdownStartTime(null);
    setCountdownDuration(null);
    setGreenStartTime(null);
    setReactionTime(null);

    if (countdownTimer.current) {
      clearTimeout(countdownTimer.current);
      countdownTimer.current = null;
    }
  };

  const handleButtonClick = () => {
    if (buttonState === 'countdown') {
      // Clicked during yellow phase - eliminated!
      setButtonState('eliminated');

      if (socket && roundId) {
        socket.emit('round:eliminate', {
          round_id: roundId,
          participant_id: participantId,
        });
      }

      if (onEliminated) {
        onEliminated();
      }
    } else if (buttonState === 'active' && greenStartTime) {
      // Clicked during green phase - record reaction time
      const clickTime = performance.now();
      const reaction = Math.round(clickTime - greenStartTime);

      setReactionTime(reaction);
      setButtonState('completed');

      if (socket && roundId) {
        socket.emit('round:button-click', {
          round_id: roundId,
          participant_id: participantId,
          reaction_time: reaction,
        });
      }

      if (onReactionRecorded) {
        onReactionRecorded(reaction);
      }
    }
  };

  const getButtonStyles = (): string => {
    const baseStyles = `
      w-[200px] h-[200px] rounded-full
      font-bold text-xl
      transition-all duration-200
      skeu-shadow-raised
      focus:outline-none focus:ring-4
    `;

    switch (buttonState) {
      case 'disabled':
        return `${baseStyles} bg-gray-600 text-gray-400 cursor-not-allowed`;

      case 'countdown':
        return `${baseStyles} bg-yellow-500 text-black cursor-pointer hover:bg-yellow-400 animate-pulse focus:ring-yellow-300`;

      case 'active':
        return `${baseStyles} bg-green-500 text-white cursor-pointer hover:bg-green-400 focus:ring-green-300 animate-pulse`;

      case 'eliminated':
        return `${baseStyles} bg-red-600 text-white cursor-not-allowed`;

      case 'completed':
        return `${baseStyles} bg-gray-700 text-gray-300 cursor-not-allowed`;

      default:
        return baseStyles;
    }
  };

  const getButtonText = (): string => {
    switch (buttonState) {
      case 'disabled':
        return 'Waiting...';

      case 'countdown':
        return 'WAIT!';

      case 'active':
        return 'CLICK NOW!';

      case 'eliminated':
        return 'Eliminated!';

      case 'completed':
        if (reactionTime !== null) {
          return `${reactionTime}ms`;
        }
        return 'Done';

      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleButtonClick}
        disabled={buttonState === 'disabled' || buttonState === 'eliminated' || buttonState === 'completed'}
        className={getButtonStyles()}
        aria-label={`Reaction button - ${buttonState}`}
      >
        {getButtonText()}
      </button>

      {/* State indicator */}
      <div className="text-center">
        {buttonState === 'countdown' && (
          <p className="text-yellow-500 font-semibold animate-pulse">
            Don't click yet! Wait for green...
          </p>
        )}

        {buttonState === 'active' && (
          <p className="text-green-500 font-semibold animate-pulse">
            Click as fast as you can!
          </p>
        )}

        {buttonState === 'eliminated' && (
          <p className="text-red-500 font-semibold">
            You clicked too early! Better luck next time.
          </p>
        )}

        {buttonState === 'completed' && reactionTime !== null && (
          <p className="text-gold-light font-semibold">
            Your reaction time: {reactionTime}ms
          </p>
        )}
      </div>
    </div>
  );
}
