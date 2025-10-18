import { CardData } from '../components/CardStack/types';

/**
 * FILO (First In, Last Out) deck implementation
 * Cards are processed in reverse order - the last card added is the first to be shown
 */
export class FILOCardDeck {
  private cards: CardData[] = [];
  private swipedIds: Set<string> = new Set();

  constructor(cards: CardData[], swipedIds?: Set<string>) {
    // Reverse the cards to implement FILO behavior
    this.cards = [...cards].reverse();
    this.swipedIds = swipedIds || new Set();
  }

  /**
   * Get available cards (not swiped) in FILO order
   */
  getAvailableCards(): CardData[] {
    return this.cards.filter(card => !this.swipedIds.has(card.id));
  }

  /**
   * Get visible cards for rendering (up to 3 cards)
   * Since cards are stored in reverse order for FILO behavior, we need to handle
   * the startIndex correctly to show the proper cards in the stack
   */
  getVisibleCards(startIndex: number = 0, count: number = 3): CardData[] {
    const available = this.getAvailableCards();
    
    // For FILO deck, we want to show the most recent cards first
    // The available array is already in FILO order (newest first)
    // startIndex should work from the beginning of the available array
    const endIndex = Math.min(startIndex + count, available.length);
    return available.slice(startIndex, endIndex);
  }

  /**
   * Mark a card as swiped
   */
  swipeCard(cardId: string): void {
    this.swipedIds.add(cardId);
  }

  /**
   * Check if the deck is empty (all cards swiped)
   */
  isEmpty(): boolean {
    return this.getAvailableCards().length === 0;
  }

  /**
   * Get the number of remaining cards
   */
  getRemainingCount(): number {
    return this.getAvailableCards().length;
  }

  /**
   * Add new cards to the deck
   */
  addCards(newCards: CardData[]): void {
    // Add new cards in reverse order to maintain FILO behavior
    this.cards = [...newCards.reverse(), ...this.cards];
  }

  /**
   * Reset all swiped cards
   */
  resetSwipedCards(): void {
    this.swipedIds.clear();
  }
}