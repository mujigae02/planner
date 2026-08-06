import React, { useState } from 'react';
import { X, Palette, Trash2, Plus, Edit2, Check } from 'lucide-react';
import { CategoryItem } from '../types';
import { PASTEL_COLORS } from '../utils/constants';

interface ColorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onUpdateCategories: (newCategories: CategoryItem[]) => void;
}

export const ColorManagerModal: React.FC<ColorManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onUpdateCategories,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);

  // 카테고리 인라인 수정 state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState(PASTEL_COLORS[0]);

  if (!isOpen) return null;

  // 1. 새 카테고리 설정(추가)
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newCategory: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: newTitle.trim(),
      color: selectedColor.bg,
      textColor: selectedColor.text,
    };

    onUpdateCategories([...categories, newCategory]);
    setNewTitle('');
  };

  // 2. 카테고리 수정 시작
  const handleStartEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditTitle(cat.name);
    const matched = PASTEL_COLORS.find((c) => c.bg === cat.color) || PASTEL_COLORS[0];
    setEditColor(matched);
  };

  // 카테고리 수정 저장
  const handleSaveEdit = (catId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    const updated = categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          name: editTitle.trim(),
          color: editColor.bg,
          textColor: editColor.text,
        };
      }
      return cat;
    });

    onUpdateCategories(updated);
    setEditingId(null);
  };

  // 3. 카테고리 삭제
  const handleDeleteCategory = (catId: string) => {
    const updated = categories.filter((cat) => cat.id !== catId);
    onUpdateCategories(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans-kr">
      <div className="lux-card w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 모달 헤더 */}
        <div className="bg-[#FAF9F7] px-6 py-4 border-b border-[#E5E1DA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-base md:text-lg font-serif-kr font-bold text-[#2D2926]">
              카테고리 색상 안내 설정 및 관리
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#E5E1DA] text-[#8C857E] hover:text-[#2D2926] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-[#8C857E] leading-relaxed">
            카테고리 범례를 설정하거나 기존 카테고리의 이름과 색상을 자유롭게 변경 및 삭제할 수 있습니다.
          </p>

          {/* 새 카테고리 추가 폼 */}
          <form onSubmit={handleAddCategory} className="p-3.5 rounded-xl bg-[#FAF9F7] border border-[#E5E1DA] space-y-3">
            <h4 className="text-xs font-bold text-[#2D2926]">새 카테고리 설정</h4>

            <div>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="카테고리 이름 (예: 운동, 독서, 업무, 건강)"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E1DA] bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 text-[#2D2926]"
              />
            </div>

            {/* 파스텔 색상 선택 */}
            <div className="grid grid-cols-3 gap-1.5">
              {PASTEL_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`p-1.5 rounded-lg text-[11px] border font-medium truncate transition-all ${
                    selectedColor.id === c.id ? 'ring-2 ring-[#2D2926] font-bold shadow-2xs' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#20487C] text-white rounded-xl text-xs font-bold hover:bg-[#16355C] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>카테고리 추가</span>
            </button>
          </form>

          {/* 등록된 카테고리 목록 */}
          <div>
            <h4 className="text-xs font-bold text-[#2D2926] mb-2 flex items-center justify-between">
              <span>현재 설정된 카테고리 목록</span>
              <span className="text-[#8C857E] font-normal">{categories.length}개</span>
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {categories.length === 0 ? (
                <p className="text-xs text-[#8C857E] text-center py-4 bg-[#FAF9F7] rounded-xl border border-dashed border-[#E5E1DA]">
                  설정된 카테고리가 없습니다. 상단에서 새로 등록해보세요.
                </p>
              ) : (
                categories.map((cat) => {
                  const isEditing = editingId === cat.id;

                  if (isEditing) {
                    return (
                      <div
                        key={cat.id}
                        className="p-3 rounded-xl border border-[#2563EB] bg-white space-y-2 shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs font-medium border border-[#E5E1DA] rounded-lg focus:outline-none focus:border-[#2563EB]"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            className="p-1.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                            title="저장"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-[#FAF9F7] text-[#8C857E] border border-[#E5E1DA] rounded-lg hover:bg-[#E5E1DA] transition-colors"
                            title="취소"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 색상 수정을 위한 파스텔 피커 */}
                        <div className="grid grid-cols-5 gap-1 pt-1">
                          {PASTEL_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={`h-6 rounded-md border text-[10px] font-medium flex items-center justify-center ${
                                editColor.id === c.id ? 'ring-2 ring-[#2563EB] font-bold' : 'opacity-80'
                              }`}
                              style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                            >
                              {c.name.slice(0, 2)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat.id}
                      className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all hover:shadow-2xs"
                      style={{
                        backgroundColor: cat.color,
                        borderColor: `${cat.color}CC`,
                        color: cat.textColor,
                      }}
                    >
                      <span className="font-gothic font-bold">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1 rounded hover:bg-black/10 transition-colors"
                          title="카테고리 수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 rounded hover:bg-black/10 transition-colors text-[#C94A4A]"
                          title="카테고리 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#FAF9F7] px-6 py-3 border-t border-[#E5E1DA] text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#20487C] text-white rounded-xl text-xs font-bold hover:bg-[#16355C] transition-colors shadow-2xs"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
