import type { TopicCard, SwipeAction, SwipeDirection } from '@/types/domain';

export interface SwipedHistoryEntry {
  card: TopicCard;
  action: SwipeAction;
  wasLiked: boolean;
}

export interface SwipeSessionState {
  deck: TopicCard[];
  swipedHistory: SwipedHistoryEntry[];
  shortlist: TopicCard[];
  superLikedCardIds: string[];
  reportedCardIds: string[];
}

/**
 * Initializes a clean swipe session state.
 */
export function initSwipeSession(
  deck: TopicCard[],
  initialShortlist: TopicCard[] = [],
  initialSuperLiked: string[] = [],
  initialReported: string[] = []
): SwipeSessionState {
  return {
    deck: [...deck],
    swipedHistory: [],
    shortlist: [...initialShortlist],
    superLikedCardIds: [...initialSuperLiked],
    reportedCardIds: [...initialReported],
  };
}

/**
 * Executes a swipe action on the active top card.
 *
 * Rules:
 * - 'skip' (← ข้าม): card is dismissed, not added to shortlist.
 * - 'interested' (→ สนใจ): card is collected into shortlist (counts toward 5 likes).
 * - 'do_it_now' (↑ อยากทำเลย): enthusiastic super-like, collected into shortlist
 *   (counts toward 5 likes) and tagged in superLikedCardIds.
 * - Action is recorded in history for undo capability.
 */
export function swipeCard(
  state: SwipeSessionState,
  direction: 'skip' | 'interested' | 'do_it_now',
  timestamp: string = new Date().toISOString()
): SwipeSessionState {
  if (state.deck.length === 0) {
    return state;
  }

  const [activeCard, ...remainingDeck] = state.deck;
  const isSuper = direction === 'do_it_now';
  const isInterested = direction === 'interested';
  const wasLiked = isSuper || isInterested;

  let nextShortlist = state.shortlist;
  let nextSuperLiked = state.superLikedCardIds;

  if (wasLiked) {
    if (!state.shortlist.some((c) => c.id === activeCard.id)) {
      nextShortlist = [...state.shortlist, activeCard];
    }
    if (isSuper && !state.superLikedCardIds.includes(activeCard.id)) {
      nextSuperLiked = [...state.superLikedCardIds, activeCard.id];
    }
  }

  const action: SwipeAction = {
    cardId: activeCard.id,
    direction: direction as SwipeDirection,
    timestamp,
  };

  const historyEntry: SwipedHistoryEntry = {
    card: activeCard,
    action,
    wasLiked,
  };

  return {
    ...state,
    deck: remainingDeck,
    swipedHistory: [...state.swipedHistory, historyEntry],
    shortlist: nextShortlist,
    superLikedCardIds: nextSuperLiked,
  };
}

/**
 * Reverts the most recent swipe action.
 *
 * Rules:
 * - Restores the card back to the top of the unswiped deck.
 * - Pops from swipedHistory.
 * - If the card was liked or super-liked, removes it from shortlist and superLikedCardIds,
 *   accurately decrementing the like counter.
 * - On empty history, cleanly returns the unchanged state (safe no-op).
 */
export function undoSwipe(state: SwipeSessionState): SwipeSessionState {
  if (state.swipedHistory.length === 0) {
    return state;
  }

  const history = [...state.swipedHistory];
  const lastEntry = history.pop()!;
  const restoredCard = lastEntry.card;

  const nextDeck = [restoredCard, ...state.deck];
  const nextShortlist = lastEntry.wasLiked
    ? state.shortlist.filter((c) => c.id !== restoredCard.id)
    : state.shortlist;
  const nextSuperLiked = lastEntry.wasLiked
    ? state.superLikedCardIds.filter((id) => id !== restoredCard.id)
    : state.superLikedCardIds;

  return {
    ...state,
    deck: nextDeck,
    swipedHistory: history,
    shortlist: nextShortlist,
    superLikedCardIds: nextSuperLiked,
  };
}

/**
 * Flags a card as reported and removes it from the current deck.
 */
export function reportCardInSession(
  state: SwipeSessionState,
  cardId: string
): SwipeSessionState {
  return {
    ...state,
    deck: state.deck.filter((c) => c.id !== cardId),
    reportedCardIds: state.reportedCardIds.includes(cardId)
      ? state.reportedCardIds
      : [...state.reportedCardIds, cardId],
  };
}

/**
 * Checks whether the learner has accumulated enough right-swipes / likes to transition to the Shortlist screen.
 * Triggers automatically at 5 liked cards.
 */
export function shouldGoToShortlist(state: SwipeSessionState): boolean {
  return state.shortlist.length >= 5;
}
