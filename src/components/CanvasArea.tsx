import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, MoreHorizontal, Palette, Trash2 } from 'lucide-react';
import CanvasElement from './CanvasElement';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ICanvasElement, ITierRow } from '@/data/templates';
import { prepareImage } from '@/lib/image';

interface CanvasAreaProps {
  rows: ITierRow[];
  elements: ICanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<ICanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onUpdateRowLabel: (rowId: string, label: string) => void;
  onUpdateRowColor: (rowId: string, color: string) => void;
  onDeleteRow: (rowId: string) => void;
  onMoveRow: (fromIndex: number, toIndex: number) => void;
  onAddImageAt: (x: number, y: number, imageUrl: string) => void;
  isCleanView: boolean;
  isRecording: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

const LABEL_WIDTH_RATIO = 0.2;

function readableTextColor(background: string) {
  const hex = background.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#15171D';
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 150 ? '#15171D' : '#FFFFFF';
}

export default function CanvasArea({
  rows,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onUpdateRowLabel,
  onUpdateRowColor,
  onDeleteRow,
  onMoveRow,
  onAddImageAt,
  isCleanView,
  isRecording,
  canvasRef,
}: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditingLabel, setIsEditingLabel] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [pendingDeleteRow, setPendingDeleteRow] = useState<ITierRow | null>(null);
  const [mobileRowMenuId, setMobileRowMenuId] = useState<string | null>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // 追踪鼠标位置（粘贴定位）
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, []);

  // 全局粘贴图片
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (isCleanView) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file && contentRef.current) {
            void prepareImage(file)
              .then((dataUrl) => {
                if (!contentRef.current) return;
                const rect = contentRef.current.getBoundingClientRect();
                const hasPointerPosition = lastMousePos.current.x > 0 || lastMousePos.current.y > 0;
                const x = hasPointerPosition
                  ? Math.max(10, lastMousePos.current.x - rect.left - 60)
                  : Math.max(10, rect.width / 2 - 60);
                const y = hasPointerPosition
                  ? Math.max(10, lastMousePos.current.y - rect.top - 60)
                  : Math.max(10, rect.height / 2 - 60);
                onAddImageAt(x, y, dataUrl);
                toast.success('图片已添加到画布');
              })
              .catch((error) => {
                toast.error(error instanceof Error ? error.message : '图片处理失败');
              });
          }
          e.preventDefault();
          break;
        }
      }
    },
    [isCleanView, onAddImageAt]
  );

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // 编辑标签
  const startEditLabel = (rowId: string, label: string) => {
    if (isCleanView) return;
    setIsEditingLabel(rowId);
    setEditLabel(label);
  };

  useEffect(() => {
    if (!isCleanView) return;
    setIsEditingLabel(null);
    setMobileRowMenuId(null);
    setPendingDeleteRow(null);
  }, [isCleanView]);

  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  const saveLabel = (rowId: string) => {
    if (editLabel.trim()) {
      onUpdateRowLabel(rowId, editLabel.trim());
    }
    setIsEditingLabel(null);
  };

  const totalHeight = rows.reduce((sum, r) => sum + (r.rowHeight ?? 120), 0);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const updateWidth = () => setContentWidth(content.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // 构建左侧标签列的 gridTemplateRows
  const gridTemplateRows = rows.map((r) => `${r.rowHeight ?? 120}px`).join(' ');

  // 计算每条水平分割线的 top 值（恰好 = 每行行高之和，即行底边界）
  const getSeparatorTop = (idx: number) => {
    let top = 0;
    for (let i = 0; i <= idx; i++) {
      top += rows[i].rowHeight ?? 120;
    }
    return top;
  };

  const handleCanvasClick = () => {
    if (isCleanView) return;
    onSelectElement(null);
  };

  return (
    <>
    <div
      ref={(el) => {
        containerRef.current = el;
        (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className={`relative flex w-full overflow-hidden bg-[#E8E8E8] ${isRecording ? 'min-w-0 rounded-none shadow-none' : 'min-w-[760px] rounded-md shadow-[0_22px_70px_rgba(8,9,13,0.34)]'}`}
      style={{ boxSizing: 'border-box' }}
      onClick={handleCanvasClick}
    >
      {/* 左侧等级标签列 — 用 CSS Grid 布局，每行高度精确等于 rowHeight */}
      <div
        className="shrink-0"
        style={{
          width: `${LABEL_WIDTH_RATIO * 100}%`,
          display: 'grid',
          gridTemplateRows,
        }}
      >
        {rows.map((row, rowIndex) => {
          const rowH = row.rowHeight ?? 120;
          const labelFontSize = row.labelFontSize ?? 32;
          return (
            <div
              key={row.id}
              className="group relative overflow-hidden"
              style={{
                backgroundColor: row.color,
                height: rowH,
                boxSizing: 'border-box',
              }}
            >
              {/* 等级标签文字 — 用 line-height 等于行高实现精确垂直居中（最可靠方案） */}
              {isCleanView ? (
                <div
                  className="w-full text-center font-semibold select-none"
                  style={{
                    height: rowH,
                    lineHeight: `${rowH}px`,
                    fontSize: isRecording
                      ? `clamp(18px, 2.3vw, ${labelFontSize}px)`
                      : `${labelFontSize}px`,
                    padding: '0 8px',
                    boxSizing: 'border-box',
                    color: readableTextColor(row.color),
                    textShadow: readableTextColor(row.color) === '#FFFFFF' ? '0 1px 2px rgba(0,0,0,.24)' : 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {row.label}
                </div>
              ) : isEditingLabel === row.id ? (
                <div
                  className="flex h-full w-full items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={labelInputRef}
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={() => saveLabel(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveLabel(row.id);
                      }
                      if (e.key === 'Escape') {
                        setIsEditingLabel(null);
                      }
                    }}
                    aria-label={`编辑等级 ${row.label}`}
                    className="w-[82%] rounded-sm bg-white/90 px-2 text-center font-semibold text-[#15171D] outline-none ring-2 ring-primary ring-offset-2 ring-offset-transparent"
                    style={{
                      fontSize: `${labelFontSize}px`,
                      lineHeight: 1,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full cursor-text text-center font-semibold select-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary"
                  style={{
                    height: rowH,
                    lineHeight: `${rowH}px`,
                    fontSize: `${labelFontSize}px`,
                    padding: '0 8px',
                    boxSizing: 'border-box',
                    color: readableTextColor(row.color),
                    textShadow: readableTextColor(row.color) === '#FFFFFF' ? '0 1px 2px rgba(0,0,0,.24)' : 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  aria-label={`编辑等级 ${row.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditLabel(row.id, row.label);
                  }}
                >
                  {row.label}
                </button>
              )}

              {!isCleanView && (
                <>
                <button
                  type="button"
                  className="absolute right-1 top-1 z-30 flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-[#15171D]/86 text-white shadow-md md:hidden"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMobileRowMenuId((current) => current === row.id ? null : row.id);
                  }}
                  aria-label={`等级 ${row.label} 操作`}
                  aria-expanded={mobileRowMenuId === row.id}
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </button>
                <div className={`absolute right-10 top-1 z-20 flex flex-col items-end gap-1 transition-opacity duration-150 md:right-1 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${mobileRowMenuId === row.id ? 'opacity-100' : 'pointer-events-none opacity-0 md:pointer-events-auto'}`}>
                  <div className="flex items-center gap-0.5 rounded-md border border-white/15 bg-[#15171D]/86 p-0.5 shadow-md backdrop-blur-sm">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-sm text-white/85 transition-colors hover:bg-white/12 hover:text-white disabled:opacity-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (rowIndex > 0) onMoveRow(rowIndex, rowIndex - 1);
                        setMobileRowMenuId(null);
                      }}
                      disabled={rowIndex === 0}
                      aria-label={`上移等级 ${row.label}`}
                    >
                      <ChevronUp className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-sm text-white/85 transition-colors hover:bg-white/12 hover:text-white disabled:opacity-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (rowIndex < rows.length - 1) onMoveRow(rowIndex, rowIndex + 1);
                        setMobileRowMenuId(null);
                      }}
                      disabled={rowIndex === rows.length - 1}
                      aria-label={`下移等级 ${row.label}`}
                    >
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-sm text-red-200 transition-colors hover:bg-red-500/28 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (rows.length <= 1) {
                          toast.warning('至少保留一行等级');
                          return;
                        }
                        setMobileRowMenuId(null);
                        setPendingDeleteRow(row);
                      }}
                      aria-label={`删除等级 ${row.label}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <label
                    className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-white/15 bg-[#15171D]/86 text-white/85 shadow-md transition-colors hover:bg-[#15171D] hover:text-white"
                    title={`修改等级 ${row.label} 的颜色`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Palette className="size-4" aria-hidden="true" />
                    <input
                      type="color"
                      value={row.color}
                      onChange={(e) => {
                        onUpdateRowColor(row.id, e.target.value);
                        setMobileRowMenuId(null);
                      }}
                      aria-label={`修改等级 ${row.label} 的颜色`}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 右侧一整块统一自由画布 */}
      <div
        ref={contentRef}
        className="relative flex-1 overflow-hidden bg-[#E8E8E8]"
        style={{ height: totalHeight, boxSizing: 'border-box' }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isCleanView) onSelectElement(null);
        }}
      >
        {/* 所有元素统一渲染在这块画布上 */}
        {elements.map((el) => (
          <CanvasElement
            key={el.id}
            element={el}
            isSelected={selectedElementId === el.id}
            isExporting={isCleanView}
            onSelect={() => onSelectElement(el.id)}
            onDelete={() => onDeleteElement(el.id)}
            onUpdate={(updates) => onUpdateElement(el.id, updates)}
            onBringForward={() => onBringForward(el.id)}
            onSendBackward={() => onSendBackward(el.id)}
            onBringToFront={() => onBringToFront(el.id)}
            onSendToBack={() => onSendToBack(el.id)}
            boundsWidth={contentWidth}
            boundsHeight={totalHeight}
          />
        ))}
      </div>

      {/* ========== 分割线层（绝对定位覆盖整张画布，保证 html2canvas 导出可见） ========== */}
      {/* 水平分割线（每条恰好位于对应行的底边界，高 2px，完全在下行顶部，不侵入上行） */}
      {rows.slice(0, -1).map((row, idx) => {
        const top = getSeparatorTop(idx);
        return (
          <div
            key={`hsep-${row.id}`}
            className="pointer-events-none absolute left-0 right-0 bg-[#15171D]/80"
            style={{ top, height: 1, zIndex: 10 }}
          />
        );
      })}

      {/* 垂直分割线（左右列之间） */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 bg-[#15171D]/82"
        style={{
          left: `${LABEL_WIDTH_RATIO * 100}%`,
          width: 1,
          zIndex: 10,
        }}
      />

      {/* 外框顶部 */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 bg-[#15171D]" style={{ height: 2, zIndex: 10 }} />
      {/* 外框底部 */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-[#15171D]" style={{ height: 2, zIndex: 10 }} />
      {/* 外框左侧 */}
      <div className="pointer-events-none absolute top-0 bottom-0 left-0 bg-[#15171D]" style={{ width: 2, zIndex: 10 }} />
      {/* 外框右侧 */}
      <div className="pointer-events-none absolute top-0 bottom-0 right-0 bg-[#15171D]" style={{ width: 2, zIndex: 10 }} />
    </div>

      <Dialog open={Boolean(pendingDeleteRow)} onOpenChange={(open) => !open && setPendingDeleteRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>删除等级「{pendingDeleteRow?.label}」？</DialogTitle>
            <DialogDescription>等级行会从画布中移除，现有图片和文字不会被删除。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteRow(null)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDeleteRow) onDeleteRow(pendingDeleteRow.id);
                setPendingDeleteRow(null);
                toast.success('等级已删除');
              }}
            >
              删除等级
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
