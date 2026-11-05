import { describe, it, expect } from 'vitest';
import {
  initSwipeSession,
  swipeCard,
  undoSwipe,
  reportCardInSession,
  shouldGoToShortlist,
} from '@/lib/discovery/session';
import type { TopicCard } from '@/types/domain';

const card1: TopicCard = {
  id: 'c1',
  subjectId: 'science',
  subfieldId: 'sci_physics',
  title: 'การ์ด 1',
  phenomenon: 'ปรากฏการณ์ 1',
  curiosityHook: 'ชวนคิด 1',
  targetGradeLevels: ['m_ton'],
  difficulty: 'beginner',
  estimatedWeeks: 4,
  estimatedBudgetBaht: 500,
  requiredEquipment: ['อุปกรณ์ 1'],
  minTeamSize: 1,
  maxTeamSize: 2,
  requiredSkills: ['ทักษะ 1'],
};

const card2: TopicCard = { ...card1, id: 'c2', title: 'การ์ด 2' };
const card3: TopicCard = { ...card1, id: 'c3', title: 'การ์ด 3' };
const card4: TopicCard = { ...card1, id: 'c4', title: 'การ์ด 4' };
const card5: TopicCard = { ...card1, id: 'c5', title: 'การ์ด 5' };
const card6: TopicCard = { ...card1, id: 'c6', title: 'การ์ด 6' };

describe('Seam 2: Swipe deck session state machine & reducer', () => {
  it('initializes session with provided deck', () => {
    const session = initSwipeSession([card1, card2]);
    expect(session.deck.length).toBe(2);
    expect(session.shortlist.length).toBe(0);
    expect(session.swipedHistory.length).toBe(0);
    expect(shouldGoToShortlist(session)).toBe(false);
  });

  it('skips a card (direction: skip) without adding to shortlist', () => {
    const s0 = initSwipeSession([card1, card2]);
    const s1 = swipeCard(s0, 'skip');

    expect(s1.deck.map((c) => c.id)).toEqual(['c2']);
    expect(s1.shortlist.length).toBe(0);
    expect(s1.swipedHistory.length).toBe(1);
    expect(s1.swipedHistory[0].action.direction).toBe('skip');
    expect(s1.swipedHistory[0].card.id).toBe('c1');
  });

  it('likes a card (direction: interested) and adds it to shortlist', () => {
    const s0 = initSwipeSession([card1, card2]);
    const s1 = swipeCard(s0, 'interested');

    expect(s1.deck.map((c) => c.id)).toEqual(['c2']);
    expect(s1.shortlist.map((c) => c.id)).toEqual(['c1']);
    expect(s1.swipedHistory.length).toBe(1);
    expect(s1.swipedHistory[0].action.direction).toBe('interested');
    expect(s1.superLikedCardIds).toEqual([]);
  });

  it('super-likes a card (direction: do_it_now) and counts toward shortlist likes with superLiked flag', () => {
    const s0 = initSwipeSession([card1, card2]);
    const s1 = swipeCard(s0, 'do_it_now');

    expect(s1.deck.map((c) => c.id)).toEqual(['c2']);
    expect(s1.shortlist.map((c) => c.id)).toEqual(['c1']);
    expect(s1.superLikedCardIds).toEqual(['c1']);
    expect(s1.swipedHistory[0].action.direction).toBe('do_it_now');
  });

  it('undo restores skipped card to top of deck without changing shortlist', () => {
    const s0 = initSwipeSession([card1, card2]);
    const s1 = swipeCard(s0, 'skip');
    expect(s1.deck.length).toBe(1);

    const s2 = undoSwipe(s1);
    expect(s2.deck.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(s2.swipedHistory.length).toBe(0);
    expect(s2.shortlist.length).toBe(0);
  });

  it('undo restores liked card to top of deck AND decrements shortlist count', () => {
    const s0 = initSwipeSession([card1, card2]);
    const s1 = swipeCard(s0, 'interested');
    expect(s1.shortlist.length).toBe(1);

    const s2 = undoSwipe(s1);
    expect(s2.deck.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(s2.shortlist.length).toBe(0);
    expect(s2.swipedHistory.length).toBe(0);
  });

  it('undo restores super-liked card and removes from superLikedCardIds', () => {
    const s0 = initSwipeSession([card1, card2]);
    const s1 = swipeCard(s0, 'do_it_now');
    expect(s1.superLikedCardIds).toContain('c1');

    const s2 = undoSwipe(s1);
    expect(s2.superLikedCardIds).not.toContain('c1');
    expect(s2.shortlist.length).toBe(0);
  });

  it('undo on empty history is a safe no-op', () => {
    const s0 = initSwipeSession([card1]);
    const s1 = undoSwipe(s0);
    expect(s1).toEqual(s0);
  });

  it('detects 5-like threshold transition to Shortlist', () => {
    let s = initSwipeSession([card1, card2, card3, card4, card5, card6]);
    expect(shouldGoToShortlist(s)).toBe(false);

    s = swipeCard(s, 'interested'); // 1
    s = swipeCard(s, 'skip'); // skip
    s = swipeCard(s, 'interested'); // 2
    s = swipeCard(s, 'do_it_now'); // 3
    s = swipeCard(s, 'interested'); // 4
    expect(shouldGoToShortlist(s)).toBe(false);

    s = swipeCard(s, 'interested'); // 5
    expect(shouldGoToShortlist(s)).toBe(true);
    expect(s.shortlist.length).toBe(5);
  });

  it('reports card: removes card from deck and records in reportedCardIds', () => {
    const s0 = initSwipeSession([card1, card2]);
    const s1 = reportCardInSession(s0, 'c1');

    expect(s1.deck.map((c) => c.id)).toEqual(['c2']);
    expect(s1.reportedCardIds).toEqual(['c1']);
  });
});
