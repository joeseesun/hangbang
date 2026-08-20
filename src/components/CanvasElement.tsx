import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Maximize2, Trash2, Type, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ICanvasElement } from '@/data/templates';
import { Image } from '@/components/ui/image';

interface CanvasElementProps {
  element: ICanvasElement;
  isSelected: boolean;
  isExporting: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<ICanvasElement>) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  boundsWidth: number;
  boundsHeight: number;
}

const MIN_WIDTH = 30;
const MIN_HEIGHT = 20;

type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | null;

export default function CanvasElement({
  element,
  isSelected,
  isExporting,
  onSelect,
  onDelete,
  onUpdate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  boundsWidth,
  boundsHeight,
}: CanvasElementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState(element.text ?? '');

  const dragStartRef = useRef({ x: 0, y: 0, elemX: 0, elemY: 0 });
  const resizeStartRef = useRef({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    elemX: 0,
    elemY: 0,
  });
  const movedDuringDragRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);

  const fontSize = element.fontSize ?? 16;
  const textColor = element.textColor ?? '#000000';

  // 文字元素根据字号自动计算高度（2倍行高 + 12px 上下 padding），防止文字被裁切
  const textAutoHeight = element.type === 'text'
    ? Math.max(50, Math.round(fontSize * 2 + 12))
    : element.height;

  useEffect(() => {
    setEditText(element.text ?? '');
  }, [element.text]);

  useEffect(() => {
    if (!isExporting) return;
    activePointerRef.current = null;
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setIsEditingText(false);
  }, [isExporting]);

  // Pointer Events 同时覆盖鼠标、触控笔与触摸屏。
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isExporting || isEditingText || isResizing) return;
      if (e.button !== 0) return;
      e.stopPropagation();

      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerRef.current = e.pointerId;
      movedDuringDragRef.current = false;
      setIsDragging(true);
      onSelect();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        elemX: element.x,
        elemY: element.y,
      };
    },
    [element.x, element.y, isEditingText, isExporting, isResizing, onSelect]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      // 移动超过 3px 判定为拖拽，不再触发点击
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        movedDuringDragRef.current = true;
      }
      if (movedDuringDragRef.current) {
        const renderedHeight = element.type === 'text' ? textAutoHeight : element.height;
        const maxX = boundsWidth > 0 ? Math.max(0, boundsWidth - element.width) : Number.POSITIVE_INFINITY;
        const maxY = boundsHeight > 0 ? Math.max(0, boundsHeight - renderedHeight) : Number.POSITIVE_INFINITY;
        onUpdate({
          x: Math.min(maxX, Math.max(0, dragStartRef.current.elemX + dx)),
          y: Math.min(maxY, Math.max(0, dragStartRef.current.elemY + dy)),
        });
      }
    };

    const handleUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;
      activePointerRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isDragging, onUpdate, boundsHeight, boundsWidth, element.height, element.type, element.width, textAutoHeight]);

  // ========== 角点缩放 ==========
  const handleResizeStart = useCallback(
    (e: React.PointerEvent, handle: ResizeHandle) => {
      if (isExporting) return;
      e.preventDefault();
      e.stopPropagation();
      activePointerRef.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsResizing(true);
      setResizeHandle(handle);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: element.width,
        h: element.height,
        elemX: element.x,
        elemY: element.y,
      };
    },
    [element.width, element.height, element.x, element.y, isExporting]
  );

  useEffect(() => {
    if (!isResizing || !resizeHandle) return;

    const handleMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      const { w, h, elemX, elemY } = resizeStartRef.current;

      let newW = w;
      let newH = h;
      let newX = elemX;
      let newY = elemY;

      if (resizeHandle.includes('e')) newW = Math.max(MIN_WIDTH, w + dx);
      if (resizeHandle.includes('w')) {
        newW = Math.max(MIN_WIDTH, w - dx);
        newX = elemX + (w - newW);
      }
      if (resizeHandle.includes('s')) newH = Math.max(MIN_HEIGHT, h + dy);
      if (resizeHandle.includes('n')) {
        newH = Math.max(MIN_HEIGHT, h - dy);
        newY = elemY + (h - newH);
      }

      onUpdate({
        width: Math.round(newW),
        height: Math.round(newH),
        x: Math.round(newX),
        y: Math.round(newY),
      });
    };

    const handleUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;
      activePointerRef.current = null;
      setIsResizing(false);
      setResizeHandle(null);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isResizing, resizeHandle, onUpdate]);

  // ========== 文字编辑 ==========
  const handleTextSave = () => {
    onUpdate({ text: editText });
    setIsEditingText(false);
  };

  // 字号快速调整
  const increaseFontSize = () => {
    onUpdate({ fontSize: Math.min(120, fontSize + 2) });
  };
  const decreaseFontSize = () => {
    onUpdate({ fontSize: Math.max(10, fontSize - 2) });
  };

  const showControls = !isExporting && isSelected && !isEditingText;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isExporting || isEditingText) return;
    const amount = event.shiftKey ? 10 : 1;
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -amount, y: 0 },
      ArrowRight: { x: amount, y: 0 },
      ArrowUp: { x: 0, y: -amount },
      ArrowDown: { x: 0, y: amount },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const renderedHeight = element.type === 'text' ? textAutoHeight : element.height;
    const maxX = boundsWidth > 0 ? Math.max(0, boundsWidth - element.width) : Number.POSITIVE_INFINITY;
    const maxY = boundsHeight > 0 ? Math.max(0, boundsHeight - renderedHeight) : Number.POSITIVE_INFINITY;
    onUpdate({
      x: Math.min(maxX, Math.max(0, element.x + move.x)),
      y: Math.min(maxY, Math.max(0, element.y + move.y)),
    });
  };

  return (
    <div
      className={`absolute select-none transition-[box-shadow,transform] duration-150 ease-out focus-visible:outline-none ${
        showControls ? 'ring-2 ring-primary ring-offset-1' : ''
      } ${isDragging ? 'z-20 scale-[1.015] cursor-grabbing shadow-2xl' : 'cursor-move'}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.type === 'text' ? textAutoHeight : element.height,
        zIndex: element.zIndex || 1,
        touchAction: 'none',
        pointerEvents: isExporting ? 'none' : 'auto',
      }}
      tabIndex={isExporting ? -1 : 0}
      role="group"
      aria-label={element.type === 'image' ? '画布图片，可拖动或缩放' : `文字：${element.text || '未命名'}`}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => {
        if (!isExporting && element.type === 'text') setIsEditingText(true);
      }}
      onKeyDown={handleKeyDown}
    >
      {/* 元素内容 */}
      {element.type === 'image' ? (
        <Image
          src={element.image}
          alt=""
          className="h-full w-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center overflow-visible px-3 py-2"
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            lineHeight: 1.3,
            fontWeight: 600,
            wordBreak: 'break-word',
            textAlign: 'center',
            whiteSpace: 'normal',
          }}
        >
          {isEditingText ? (
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleTextSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTextSave();
                }
                if (e.key === 'Escape') {
                  setEditText(element.text ?? '');
                  setIsEditingText(false);
                }
              }}
              autoFocus
              className="h-auto border-0 bg-transparent text-center font-bold focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ fontSize: `${fontSize}px`, color: textColor, lineHeight: 1.3 }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="w-full px-1 leading-none">{element.text || '双击编辑'}</span>
          )}
        </div>
      )}

      {/* 选中时显示操作控件 */}
      {showControls && (
        <>
          {/* 顶部浮动工具栏（仅文字元素显示字号调整） */}
          {element.type === 'text' && (
            <div className="absolute -top-10 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-md border border-border bg-background p-1 shadow-lg">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  decreaseFontSize();
                }}
                aria-label="减小字号"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[44px] text-center text-xs font-medium tabular-nums text-muted-foreground">
                {fontSize}px
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  increaseFontSize();
                }}
                aria-label="增大字号"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <div className="mx-1 h-4 w-px bg-border" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="文字设置"
                  >
                    <Type className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  className="w-56"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuLabel>文字颜色</DropdownMenuLabel>
                  <div className="flex flex-wrap gap-1 px-2 pb-2">
                    {[
                      '#000000',
                      '#FFFFFF',
                      '#FF4D4F',
                      '#F2B85C',
                      '#F9E65A',
                      '#52C41A',
                      '#1890FF',
                      '#722ED1',
                    ].map((c) => (
                      <button
                        key={c}
                        className="h-6 w-6 rounded border border-black/20 transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({ textColor: c });
                        }}
                        aria-label={`文字颜色 ${c}`}
                      />
                    ))}
                    <label className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-black/20 hover:scale-110" title="自定义文字颜色">
                      <Type className="h-3 w-3" />
                      <input
                        type="color"
                        value={textColor}
                        className="sr-only"
                        onChange={(e) => onUpdate({ textColor: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </label>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* 四个角的缩放手柄 */}
          {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => {
            const posClass =
              handle === 'nw'
                ? 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize'
                : handle === 'ne'
                  ? 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize'
                  : handle === 'sw'
                    ? 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize'
                    : 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-se-resize';
            return (
              <div
                key={handle}
                className={`absolute z-30 flex h-11 w-11 items-center justify-center ${posClass}`}
                role="button"
                aria-label={`从${handle}方向缩放元素`}
                onPointerDown={(e) => handleResizeStart(e, handle)}
              >
                <span className="h-3.5 w-3.5 rounded-sm border-2 border-primary bg-white shadow-sm" />
              </div>
            );
          })}

          {/* 右上角：删除按钮 */}
          <Button
            size="icon"
            variant="destructive"
            className="!absolute -right-5 -top-5 z-30 h-11 w-11 rounded-full border-0 bg-transparent p-2 shadow-none hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="删除元素"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md">
              <X className="h-3.5 w-3.5" />
            </span>
          </Button>

          {/* 右下角：更多操作菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="!absolute -bottom-5 -right-5 z-30 h-11 w-11 rounded-full border-0 bg-transparent p-2 shadow-none hover:bg-transparent"
                onClick={(e) => e.stopPropagation()}
                aria-label="更多元素操作"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-md">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              className="w-52"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuLabel>层级</DropdownMenuLabel>
              <DropdownMenuItem onClick={onBringToFront}>置顶</DropdownMenuItem>
              <DropdownMenuItem onClick={onBringForward}>上移一层</DropdownMenuItem>
              <DropdownMenuItem onClick={onSendBackward}>下移一层</DropdownMenuItem>
              <DropdownMenuItem onClick={onSendToBack}>置底</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除元素
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
