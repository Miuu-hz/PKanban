import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { DndContext, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { apiClient } from '../services/apiClient';
import { useKanbanStore, type Column, type Card } from '../stores/useKanbanStore';

export default function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { columns, cards, setColumns, setCardsForList, moveCard } = useKanbanStore();
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    if (!boardId) return;
    apiClient.get(`/kanban/boards/${boardId}`).then((res) => {
      const board = res.data.item;
      setBoardName(board.name);
      const cols: Column[] = (res.data.included?.lists ?? []).sort(
        (a: Column, b: Column) => a.position - b.position,
      );
      setColumns(cols);
      for (const col of cols) {
        const colCards: Card[] = (res.data.included?.cards ?? [])
          .filter((c: Card) => c.listId === col.id)
          .sort((a: Card, b: Card) => a.position - b.position);
        setCardsForList(col.id, colCards);
      }
    }).finally(() => setLoading(false));
  }, [boardId, setColumns, setCardsForList]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const cardId = String(active.id);
    const toListId = String(over.id);
    const fromListId = [...cards.entries()].find(([, c]) => c.some((x) => x.id === cardId))?.[0];
    if (!fromListId || fromListId === toListId) return;
    moveCard(cardId, fromListId, toListId, 65535);
    apiClient.patch(`/kanban/cards/${cardId}`, { listId: toListId }).catch(() =>
      moveCard(cardId, toListId, fromListId, 0),
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <div className="safe-top flex items-center gap-2 bg-line px-3 py-3 text-white shadow">
        <button onClick={() => navigate('/')} className="rounded-lg p-1.5 hover:bg-white/20">
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 truncate text-base font-semibold">{boardName}</h1>
      </div>

      {/* Kanban columns — horizontal scroll */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-3 overflow-x-auto p-3 snap-x snap-mandatory">
          {columns.map((col) => (
            <KanbanColumn key={col.id} column={col} cards={cards.get(col.id) ?? []} />
          ))}
          <button
            className="flex h-fit w-[85vw] max-w-[320px] shrink-0 snap-start items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 p-4 text-gray-400 hover:border-line hover:text-line"
            onClick={() => {/* TODO: create column modal */}}
          >
            <Plus size={18} />
            <span className="text-sm">เพิ่มคอลัมน์</span>
          </button>
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({ column, cards }: { column: Column; cards: Card[] }) {
  return (
    <div className="w-[85vw] max-w-[320px] shrink-0 snap-start rounded-2xl bg-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{column.name}</span>
        <span className="rounded-full bg-gray-300 px-2 py-0.5 text-xs text-gray-600">{cards.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <div key={card.id} className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-sm text-gray-800 leading-snug">{card.name}</p>
            {card.dueDate && (
              <p className="mt-1 text-xs text-gray-400">
                📅 {new Date(card.dueDate).toLocaleDateString('th-TH')}
              </p>
            )}
          </div>
        ))}
        <button className="flex items-center gap-1 rounded-xl py-1.5 px-2 text-xs text-gray-400 hover:bg-gray-300/50">
          <Plus size={14} /> เพิ่มการ์ด
        </button>
      </div>
    </div>
  );
}
