import { useReducer, useCallback, useState, useEffect } from 'react';
import { CardData } from './types';

interface DeckState {
    currentIndex: number;
    history: number[]; // Track previous indices for "undo" capability if needed
    swipedSet: Set<string>; // ID tracking for visual differentiation
    direction: 'left' | 'right' | null; // For exit animations
}

type Action =
    | { type: 'NEXT'; direction: 'left' | 'right' }
    | { type: 'BACK' }
    | { type: 'RESET' };

const initialState: DeckState = {
    currentIndex: 0,
    history: [],
    swipedSet: new Set(),
    direction: null,
};

function reducer(state: DeckState, action: Action, totalCards: number): DeckState {
    switch (action.type) {
        case 'NEXT': {
            if (state.currentIndex >= totalCards) return state;
            return {
                ...state,
                currentIndex: state.currentIndex + 1,
                history: [...state.history, state.currentIndex],
                direction: action.direction,
            };
        }
        case 'BACK': {
            if (state.history.length === 0) return state;
            const prevIndex = state.history[state.history.length - 1];
            return {
                ...state,
                currentIndex: prevIndex,
                history: state.history.slice(0, -1),
                direction: null, // Reset direction on back
            };
        }
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

export function useCardDeck(cards: CardData[], initialIndex = 0) {
    // Wrap reducer to bind totalCards without useEffect
    const reducerWithCount = useCallback(
        (state: DeckState, action: Action) => reducer(state, action, cards.length),
        [cards.length]
    );

    const [state, dispatch] = useReducer(reducerWithCount, {
        ...initialState,
        currentIndex: initialIndex,
        history: Array.from({ length: initialIndex }, (_, i) => i)
    });

    const next = useCallback((direction: 'left' | 'right') => {
        dispatch({ type: 'NEXT', direction });
    }, []);

    const back = useCallback(() => {
        dispatch({ type: 'BACK' });
    }, []);

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    // Derived state - Purely index based
    const currentCard = cards[state.currentIndex] || null;
    const nextCard = cards[state.currentIndex + 1] || null;
    const isFinished = state.currentIndex >= cards.length && cards.length > 0;

    return {
        currentIndex: state.currentIndex,
        direction: state.direction,
        currentCard,
        nextCard,
        isFinished,
        next,
        back,
        reset,
    };
}
