import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useTierList } from '@/hooks/useTierList';
import ToolbarSection from '@/components/ToolbarSection';
import CanvasArea from '@/components/CanvasArea';
import SiteFooter from '@/components/SiteFooter';
import RecordingExitButton from '@/components/RecordingExitButton';
import type { ICanvasElement } from '@/data/templates';
import { prepareImage } from '@/lib/image';

type CanvasViewMode = 'edit' | 'recording' | 'exporting';

export default function HomePage() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CanvasViewMode>('edit');

  const {
    title,
    rows,
    elements,
    templateId,
    updateTitle,
    addRow,
    deleteRow,
    updateRowLabel,
    updateRowColor,
    updateRowLabelFontSize,
    moveRow,
    addTextElement,
    addImageElement,
    deleteElement,
    updateElement,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    loadTemplate,
    clearElements,
    resetToDefault,
    templates,
    isLoaded,
  } = useTierList();

  // 画布总高
  const totalHeight = rows.reduce((sum, r) => sum + (r.rowHeight ?? 120), 0);

  // 添加文字到画布中央（零弹窗，默认内容「文本」）
  const handleAddText = useCallback(() => {
    const x = window.innerWidth < 768 ? 40 : 280;
    const y = Math.max(20, totalHeight / 2 - 20);
    const id = addTextElement(x, y, '文本');
    setSelectedElementId(id);
    toast.success('文字已添加到画布，双击可编辑');
  }, [totalHeight, addTextElement]);

  // 上传图片（放到画布中央）
  const handleUploadImage = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await prepareImage(file);
        const x = window.innerWidth < 768 ? 40 : 280;
        const y = Math.max(20, totalHeight / 2 - 60);
        const id = addImageElement(x, y, dataUrl);
        setSelectedElementId(id);
        toast.success('图片已添加到画布');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '图片处理失败');
      }
    },
    [totalHeight, addImageElement]
  );

  // 在指定坐标添加图片（粘贴用，坐标是相对右侧内容区的）
  const handleAddImageAt = useCallback(
    (x: number, y: number, imageUrl: string) => {
      const id = addImageElement(x, y, imageUrl);
      setSelectedElementId(id);
    },
    [addImageElement]
  );

  const handleSelectElement = useCallback((id: string | null) => {
    setSelectedElementId(id);
  }, []);

  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<ICanvasElement>) => {
      updateElement(id, updates);
    },
    [updateElement]
  );

  const handleCanvasClick = () => {
    if (viewMode !== 'edit') return;
    setSelectedElementId(null);
  };

  const enterRecordingMode = useCallback(() => {
    toast.dismiss();
    setSelectedElementId(null);
    setViewMode('recording');
  }, []);

  const exitRecordingMode = useCallback(() => {
    setViewMode('edit');
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('[data-recording-trigger]')?.focus();
    });
  }, []);

  useEffect(() => {
    document.body.dataset.canvasMode = viewMode;
    if (viewMode !== 'recording') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitRecordingMode();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exitRecordingMode, viewMode]);

  const isRecording = viewMode === 'recording';
  const isCleanView = viewMode !== 'edit';

  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] bg-background px-4 py-20" aria-busy="true">
        <span className="sr-only">正在恢复画布</span>
        <div className="mx-auto h-[560px] max-w-[1400px] animate-pulse rounded-md bg-white/5" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background" data-view-mode={viewMode}>
      {!isRecording && <a href="#tier-canvas" className="skip-link">跳到画布</a>}
      {!isRecording && <ToolbarSection
        title={title}
        onTitleChange={updateTitle}
        templates={templates}
        currentTemplateId={templateId}
        onLoadTemplate={loadTemplate}
        onAddRow={addRow}
        onAddText={handleAddText}
        onUploadImage={handleUploadImage}
        onClearAll={clearElements}
        onReset={resetToDefault}
        onEnterRecording={enterRecordingMode}
        onExportStart={() => {
          setSelectedElementId(null);
          setViewMode('exporting');
        }}
        onExportEnd={() => setViewMode('edit')}
        canvasRef={canvasRef as React.RefObject<HTMLElement | null>}
      />}

      {isRecording && <RecordingExitButton onExit={exitRecordingMode} />}
      <p className="sr-only" aria-live="polite">
        {isRecording ? '已进入录屏模式，按 Esc 或使用右上角按钮退出' : ''}
      </p>

      <main
        id="tier-canvas"
        className={isRecording
          ? 'flex min-h-dvh flex-1 items-center p-0'
          : 'flex-1 px-4 py-5 sm:px-6 sm:py-7'}
      >
        <div className={isRecording ? 'w-full' : 'mx-auto max-w-[1400px]'} onClick={handleCanvasClick}>
          <div className={isRecording
            ? 'w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : 'canvas-scroll overflow-x-auto overscroll-x-contain pb-2'}
          >
            <CanvasArea
              rows={rows}
              elements={elements}
              selectedElementId={selectedElementId}
              onSelectElement={handleSelectElement}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={deleteElement}
              onBringForward={bringForward}
              onSendBackward={sendBackward}
              onBringToFront={bringToFront}
              onSendToBack={sendToBack}
              onUpdateRowLabel={updateRowLabel}
              onUpdateRowColor={updateRowColor}
              onDeleteRow={deleteRow}
              onMoveRow={moveRow}
              onAddImageAt={handleAddImageAt}
              isCleanView={isCleanView}
              isRecording={isRecording}
              canvasRef={canvasRef}
            />
          </div>
        </div>

        {viewMode === 'edit' && (
          <div className="mx-auto mt-4 max-w-[1400px] text-center text-sm text-white/55">
            <p>
              电脑端可按 <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-xs">⌘ / Ctrl + V</kbd>{' '}
              粘贴图片；拖动元素可跨越等级，双击文字可编辑。
            </p>
          </div>
        )}
      </main>
      {!isRecording && <SiteFooter />}
    </div>
  );
}
