import { describe, it, expect, beforeEach } from 'vitest';
import { useKanbanStore, type Board, type Card, type Column } from '../../stores/useKanbanStore';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    name: 'Test Card',
    listId: 'list-todo',
    position: 0,
    ...overrides,
  };
}

describe('useKanbanStore', () => {
  beforeEach(() => {
    useKanbanStore.setState({
      boards: [],
      activeBoard: null,
      columns: [],
      cards: new Map(),
    });
  });

  describe('setBoards', () => {
    it('stores board list', () => {
      const boards: Board[] = [{ id: 'b1', name: 'Board 1', projectId: 'p1' }];
      useKanbanStore.getState().setBoards(boards);
      expect(useKanbanStore.getState().boards).toHaveLength(1);
      expect(useKanbanStore.getState().boards[0].name).toBe('Board 1');
    });
  });

  describe('setActiveBoard', () => {
    it('sets the active board', () => {
      const board: Board = { id: 'b1', name: 'Active', projectId: 'p1' };
      useKanbanStore.getState().setActiveBoard(board);
      expect(useKanbanStore.getState().activeBoard?.id).toBe('b1');
    });
  });

  describe('setColumns', () => {
    it('stores column list', () => {
      const cols: Column[] = [
        { id: 'l1', name: 'To Do', boardId: 'b1', position: 0 },
        { id: 'l2', name: 'Done', boardId: 'b1', position: 1 },
      ];
      useKanbanStore.getState().setColumns(cols);
      expect(useKanbanStore.getState().columns).toHaveLength(2);
    });
  });

  describe('setCardsForList', () => {
    it('stores cards under the correct listId', () => {
      const cards = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })];
      useKanbanStore.getState().setCardsForList('list-todo', cards);
      expect(useKanbanStore.getState().cards.get('list-todo')).toHaveLength(2);
    });

    it('overwrites existing cards for that list', () => {
      useKanbanStore.getState().setCardsForList('list-todo', [makeCard({ id: 'c1' })]);
      useKanbanStore.getState().setCardsForList('list-todo', [makeCard({ id: 'c2' }), makeCard({ id: 'c3' })]);
      expect(useKanbanStore.getState().cards.get('list-todo')).toHaveLength(2);
    });
  });

  describe('moveCard', () => {
    it('moves card from source list to destination list', () => {
      useKanbanStore.getState().setCardsForList('list-todo', [makeCard({ id: 'card-1', listId: 'list-todo' })]);
      useKanbanStore.getState().setCardsForList('list-done', []);

      useKanbanStore.getState().moveCard('card-1', 'list-todo', 'list-done', 65535);

      expect(useKanbanStore.getState().cards.get('list-todo')).toHaveLength(0);
      expect(useKanbanStore.getState().cards.get('list-done')).toHaveLength(1);
      expect(useKanbanStore.getState().cards.get('list-done')![0].listId).toBe('list-done');
    });

    it('does nothing when card is not found', () => {
      useKanbanStore.getState().setCardsForList('list-todo', [makeCard({ id: 'other-card' })]);
      useKanbanStore.getState().moveCard('nonexistent', 'list-todo', 'list-done', 0);
      expect(useKanbanStore.getState().cards.get('list-todo')).toHaveLength(1);
    });

    it('preserves other cards in source list', () => {
      useKanbanStore.getState().setCardsForList('list-todo', [
        makeCard({ id: 'card-1' }),
        makeCard({ id: 'card-2' }),
        makeCard({ id: 'card-3' }),
      ]);
      useKanbanStore.getState().setCardsForList('list-done', []);

      useKanbanStore.getState().moveCard('card-2', 'list-todo', 'list-done', 0);

      const remaining = useKanbanStore.getState().cards.get('list-todo')!;
      expect(remaining).toHaveLength(2);
      expect(remaining.map((c) => c.id)).toEqual(['card-1', 'card-3']);
    });
  });

  describe('updateCard', () => {
    it('updates card fields in-place', () => {
      useKanbanStore.getState().setCardsForList('list-todo', [
        makeCard({ id: 'card-1', name: 'Old Name' }),
      ]);

      useKanbanStore.getState().updateCard({ id: 'card-1', name: 'New Name', dueDate: '2026-07-01' });

      const card = useKanbanStore.getState().cards.get('list-todo')![0];
      expect(card.name).toBe('New Name');
      expect(card.dueDate).toBe('2026-07-01');
    });

    it('does not change cards in other lists', () => {
      useKanbanStore.getState().setCardsForList('list-todo', [makeCard({ id: 'c1', name: 'A' })]);
      useKanbanStore.getState().setCardsForList('list-done', [makeCard({ id: 'c2', name: 'B' })]);

      useKanbanStore.getState().updateCard({ id: 'c1', name: 'Updated A' });

      expect(useKanbanStore.getState().cards.get('list-done')![0].name).toBe('B');
    });
  });

  describe('addCard', () => {
    it('appends card to the correct list', () => {
      useKanbanStore.getState().setCardsForList('list-todo', [makeCard({ id: 'existing' })]);

      useKanbanStore.getState().addCard(makeCard({ id: 'new-card', listId: 'list-todo' }));

      const cards = useKanbanStore.getState().cards.get('list-todo')!;
      expect(cards).toHaveLength(2);
      expect(cards[1].id).toBe('new-card');
    });

    it('creates new list entry if list had no cards', () => {
      useKanbanStore.getState().addCard(makeCard({ id: 'c1', listId: 'new-list' }));
      expect(useKanbanStore.getState().cards.get('new-list')).toHaveLength(1);
    });
  });
});
