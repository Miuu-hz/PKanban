import { create } from 'zustand';

export interface Board { id: string; name: string; projectId: string }
export interface Column { id: string; name: string; boardId: string; position: number }
export interface Card {
  id: string; name: string; listId: string;
  dueDate?: string; memberIds?: string[];
  description?: string; position: number;
}

interface KanbanState {
  boards: Board[];
  activeBoard: Board | null;
  columns: Column[];
  cards: Map<string, Card[]>; // listId → cards
  setBoards: (boards: Board[]) => void;
  setActiveBoard: (board: Board) => void;
  setColumns: (columns: Column[]) => void;
  setCardsForList: (listId: string, cards: Card[]) => void;
  moveCard: (cardId: string, fromListId: string, toListId: string, position: number) => void;
  updateCard: (card: Partial<Card> & { id: string }) => void;
  addCard: (card: Card) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  boards: [],
  activeBoard: null,
  columns: [],
  cards: new Map(),

  setBoards: (boards) => set({ boards }),
  setActiveBoard: (board) => set({ activeBoard: board }),
  setColumns: (columns) => set({ columns }),

  setCardsForList: (listId, cards) =>
    set((s) => {
      const next = new Map(s.cards);
      next.set(listId, cards);
      return { cards: next };
    }),

  moveCard: (cardId, fromListId, toListId) =>
    set((s) => {
      const next = new Map(s.cards);
      const fromList = [...(next.get(fromListId) ?? [])];
      const idx = fromList.findIndex((c) => c.id === cardId);
      if (idx === -1) return {};
      const [card] = fromList.splice(idx, 1);
      const toList = [...(next.get(toListId) ?? [])];
      toList.push({ ...card, listId: toListId });
      next.set(fromListId, fromList);
      next.set(toListId, toList);
      return { cards: next };
    }),

  updateCard: (partial) =>
    set((s) => {
      const next = new Map(s.cards);
      for (const [listId, cards] of next) {
        const idx = cards.findIndex((c) => c.id === partial.id);
        if (idx !== -1) {
          const updated = [...cards];
          updated[idx] = { ...updated[idx], ...partial };
          next.set(listId, updated);
          break;
        }
      }
      return { cards: next };
    }),

  addCard: (card) =>
    set((s) => {
      const next = new Map(s.cards);
      const list = [...(next.get(card.listId) ?? [])];
      list.push(card);
      next.set(card.listId, list);
      return { cards: next };
    }),
}));
