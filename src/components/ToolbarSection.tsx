import { useEffect, useState, useRef } from 'react';
import {
  Download,
  RotateCcw,
  Trash2,
  Plus,
  LayoutTemplate,
  ChevronDown,
  ImagePlus,
  Type,
  MoreHorizontal,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { ITierTemplate } from '@/data/templates';

interface ToolbarSectionProps {
  title: string;
  onTitleChange: (title: string) => void;
  templates: ITierTemplate[];
  currentTemplateId: string;
  onLoadTemplate: (templateId: string) => void;
  onAddRow: () => void;
  onAddText: () => void;
  onUploadImage: (file: File) => void | Promise<void>;
  onClearAll: () => void;
  onReset: () => void;
  onEnterRecording: () => void;
  onExportStart?: () => void;
  onExportEnd?: () => void;
  canvasRef: React.RefObject<HTMLElement | null>;
}

export default function ToolbarSection({
  title,
  onTitleChange,
  templates,
  currentTemplateId,
  onLoadTemplate,
  onAddRow,
  onAddText,
  onUploadImage,
  onClearAll,
  onReset,
  onEnterRecording,
  onExportStart,
  onExportEnd,
  canvasRef,
}: ToolbarSectionProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [isExporting, setIsExporting] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingTitle) setEditTitle(title);
  }, [title, isEditingTitle]);

  const handleTitleSave = () => {
    if (editTitle.trim()) {
      onTitleChange(editTitle.trim());
    } else {
      setEditTitle(title);
    }
    setIsEditingTitle(false);
  };

  // 上传图片
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadImage(file);
    e.target.value = '';
  };

  // 模板切换
  const handleLoadTemplate = (tplId: string) => {
    if (tplId === currentTemplateId) {
      toast.info('当前已是该模板');
      return;
    }
    setPendingTemplateId(tplId);
  };

  // 导出 PNG
  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    onExportStart?.();
    let clone: HTMLElement | null = null;

    try {
      // 等待 React 重新渲染（isExporting=true 会清除所有交互元素：选中框、操作按钮、缩放手柄等）
      await new Promise((r) => setTimeout(r, 250));

      // 克隆此时的纯净 DOM（只包含纯展示内容）
      clone = canvasRef.current.cloneNode(true) as HTMLElement;

      // 立即恢复交互态，不让用户长时间看到无响应的画布
      setIsExporting(false);

      // 克隆节点放到屏幕外以确保样式计算正确
      clone.style.position = 'fixed';
      clone.style.left = '-99999px';
      clone.style.top = '0';
      clone.style.pointerEvents = 'none';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      document.body.appendChild(clone);

      // 等待克隆节点里所有图片加载完成
      const cloneImgs = clone.querySelectorAll('img');
      const imgPromises: Promise<void>[] = [];
      cloneImgs.forEach((img) => {
        if (!img.complete && img.src) {
          imgPromises.push(
            new Promise((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            })
          );
        }
      });
      if (imgPromises.length > 0) {
        await Promise.all(imgPromises);
      }

      // 再等一帧确保布局稳定
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      const { default: html2canvas } = await import('html2canvas-pro');
      const canvas = await html2canvas(clone, {
        backgroundColor: '#E8E8E8',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      if (!blob) throw new Error('Failed to generate image');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (title || 'tier-list').replace(/[\\/:*?"<>|]/g, '-').trim();
      a.download = `${safeTitle || 'tier-list'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('图片已下载');
    } catch (error) {
      toast.error('导出失败，请减少图片数量后重试');
      console.error('Export failed:', error);
      setIsExporting(false);
    } finally {
      clone?.remove();
      setIsExporting(false);
      onExportEnd?.();
    }
  };

  return (
    <section className="sticky top-0 z-40 w-full border-b border-white/8 bg-background/94 shadow-[0_10px_28px_rgba(8,9,13,0.16)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTitleSave();
                }
                if (e.key === 'Escape') {
                  setEditTitle(title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="h-9 w-64 text-lg font-bold"
            />
          ) : (
            <button
              type="button"
              className="min-w-0 cursor-text truncate rounded-sm text-left text-lg font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:text-xl"
              onClick={() => {
                setEditTitle(title);
                setIsEditingTitle(true);
              }}
              aria-label={`编辑标题：${title}`}
            >
              {title}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={onEnterRecording}
            data-recording-trigger
          >
            <EyeOff className="mr-1 h-4 w-4" aria-hidden="true" />
            录屏模式
          </Button>

          <Button size="sm" variant="outline" onClick={handleUploadClick}>
            <ImagePlus className="mr-1 h-4 w-4" />
            插入图片
          </Button>

          <Button size="sm" variant="outline" onClick={onAddText}>
            <Type className="mr-1 h-4 w-4" />
            添加文字
          </Button>

          <Button size="sm" variant="outline" onClick={onAddRow}>
            <Plus className="mr-1 h-4 w-4" />
            添加等级
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <LayoutTemplate className="mr-1 h-4 w-4" />
                模板
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>选择预设模板</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {templates.map((tpl) => (
                <DropdownMenuItem
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl.id)}
                  className={tpl.id === currentTemplateId ? 'bg-accent text-accent-foreground' : ''}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {tpl.name}
                      {tpl.id === currentTemplateId && (
                        <span className="ml-2 text-xs opacity-70">（当前）</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{tpl.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label="更多画布操作">
                <MoreHorizontal className="mr-1 h-4 w-4" />
                更多
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setClearDialogOpen(true)}>
                <Trash2 className="mr-2 size-4" />
                清空元素
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResetDialogOpen(true)}>
                <RotateCcw className="mr-2 size-4" />
                重置画布
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="mr-1 h-4 w-4" />
            {isExporting ? '导出中…' : '导出 PNG'}
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(pendingTemplateId)} onOpenChange={(open) => !open && setPendingTemplateId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>加载新模板？</DialogTitle>
            <DialogDescription>当前标题、等级和画布元素会被新模板覆盖。此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingTemplateId(null)}>取消</Button>
            <Button
              onClick={() => {
                if (!pendingTemplateId) return;
                const tpl = templates.find((item) => item.id === pendingTemplateId);
                onLoadTemplate(pendingTemplateId);
                setPendingTemplateId(null);
                toast.success(`已加载「${tpl?.name}」模板`);
              }}
            >
              加载模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空确认 */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清空所有元素？</DialogTitle>
            <DialogDescription>
              此操作将删除画布中的所有图片和文字元素，但保留等级行结构。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClearAll();
                setClearDialogOpen(false);
                toast.success('已清空所有元素');
              }}
            >
              确认清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置确认 */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置为默认模板？</DialogTitle>
            <DialogDescription>
              此操作将清除当前所有内容，并恢复为默认的「夯系列」模板。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onReset();
                setResetDialogOpen(false);
                toast.success('已重置为默认模板');
              }}
            >
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </section>
  );
}
