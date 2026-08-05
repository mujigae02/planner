import React, { useState } from 'react';
import { X, Sparkles, Trash2, Plus } from 'lucide-react';
import { PASTEL_COLORS } from '../utils/constants';

interface ColorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorMap: Record<string, { color: string; textColor: string }>;
  onUpdateColorMap: (newMap: Record<string, { color: string; textColor: string }>) => void;
}

export const ColorManagerModal: React.FC<ColorManagerModalProps> = ({
  isOpen,
  onClose,
  colorMap,
  onUpdateColorMap,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);

  if (!isOpen) return null;

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const updated = {
      ...colorMap,
      [newTitle.trim()]: {
        color: selectedColor.bg,
        textColor: selectedColor.text,
      },
    };

    onUpdateColorMap(updated);
    setNewTitle('');
  };

  const handleDeleteRule = (titleKey: string) => {
    const updated = { ...colorMap };
    delete updated[titleKey];
    onUpdateColorMap(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans-kr">
      <div className="lux-card w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 모달 헤더 */}
        <div className="bg-[#FAF9F7] px-6 py-4 border-b border-[#E5E1DA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C28E00]" />
            <h3 className="text-base md:text-lg font-serif-kr font-normal text-[#2D2926]">
              자동 색상 (Auto-Color) 매핑 관리
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
            일정 등록 시 지정한 제목에 파스텔 배경 색상이 자동 매핑됩니다. 키워드 규칙을 자유롭게 추가해보세요.
          </p>

          {/* 새 자동 색상 규칙 추가 폼 */}
          <form onSubmit={handleAddRule} className="p-3.5 rounded-xl bg-[#FAF9F7] border border-[#E5E1DA] space-y-3">
            <h4 className="text-xs font-medium text-[#2D2926]">새 자동 색상 규칙 추가</h4>

            <div>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="일정 키워드 (예: 운동, 독서, 회의)"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E1DA] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#2D2926]/20 text-[#2D2926]"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {PASTEL_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`p-1.5 rounded-lg text-[11px] border font-medium truncate ${
                    selectedColor.id === c.id ? 'ring-2 ring-[#2D2926] font-bold' : ''
                  }`}
                  style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#2D2926] text-white rounded-full text-xs font-medium hover:bg-[#1A1A1A] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>규칙 등록</span>
            </button>
          </form>

          {/* 등록된 매핑 목록 */}
          <div>
            <h4 className="text-xs font-medium text-[#2D2926] mb-2">
              현재 등록된 매핑 규칙 ({Object.keys(colorMap).length}개)
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.keys(colorMap).length === 0 ? (
                <p className="text-xs text-[#8C857E] text-center py-4">등록된 자동 매핑 규칙이 없습니다.</p>
              ) : (
                Object.entries(colorMap).map(([titleKey, val]) => {
                  const item = val as { color: string; textColor: string };
                  return (
                    <div
                      key={titleKey}
                      className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
                      style={{ backgroundColor: item.color, borderColor: `${item.color}EE`, color: item.textColor }}
                    >
                      <span className="font-serif-kr font-medium">{titleKey}</span>
                      <button
                        onClick={() => handleDeleteRule(titleKey)}
                        className="p-1 rounded hover:bg-black/10 transition-colors"
                        title="규칙 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
            className="px-4 py-1.5 bg-[#2D2926] text-white rounded-full text-xs font-medium hover:bg-[#1A1A1A] transition-colors shadow-2xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

