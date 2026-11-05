import type { TopicCard } from '@/types/domain';
import { SCIENCE_TOPIC_CARDS } from './cards/science';
import { COMPUTER_TOPIC_CARDS } from './cards/computer';
import { MATHEMATICS_TOPIC_CARDS } from './cards/mathematics';

export { SCIENCE_TOPIC_CARDS, COMPUTER_TOPIC_CARDS, MATHEMATICS_TOPIC_CARDS };

export const TOPIC_CARDS: TopicCard[] = [
  ...SCIENCE_TOPIC_CARDS,
  ...COMPUTER_TOPIC_CARDS,
  ...MATHEMATICS_TOPIC_CARDS,
];
