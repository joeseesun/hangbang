import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  MOCK_TEMPLATES,
  type ICanvasElement,
  type ITierRow,
  type ITierTemplate,
} from '@/data/templates';
import {
  loadCanvasData,
  saveCanvasData,
  type PersistedCanvasData,
} from '@/lib/tierListPersistence';

const DEFAULT_TEMPLATE_ID = 'hang';

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function buildDefaultRows(tpl: ITierTemplate): ITierRow[] {
  return tpl.rows.map((r) => ({
    ...r,
    id: genId('row'),
    labelFontSize: r.labelFontSize ?? 32,
    rowHeight: r.rowHeight ?? 120,
  }));
}

export function useTierList() {
  const [title, setTitle] = useState('我的梯队排行');
  const [rows, setRows] = useState<ITierRow[]>([]);
  const [elements, setElements] = useState<ICanvasElement[]>([]);
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [isLoaded, setIsLoaded] = useState(false);
  const maxZRef = useRef(1);
  const saveTimerRef = useRef<number | null>(null);

  // 从 IndexedDB 加载；自动兼容旧 localStorage 数据。
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const parsed = await loadCanvasData();
        if (cancelled) return;
        if (parsed) {
        if (parsed.title !== undefined) setTitle(parsed.title);
        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          setRows(parsed.rows);
        }
        if (Array.isArray(parsed.elements)) {
          setElements(parsed.elements);
          if (parsed.elements.length > 0) {
            maxZRef.current = Math.max(...parsed.elements.map((e) => e.zIndex || 0), 1) + 1;
          }
        }
        if (parsed.templateId) setTemplateId(parsed.templateId);
        } else {
          const tpl = MOCK_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) || MOCK_TEMPLATES[0];
          setTitle(tpl.title);
          setRows(buildDefaultRows(tpl));
          setTemplateId(tpl.id);
        }
      } catch (error) {
        console.error('Failed to load canvas data:', error);
        const tpl = MOCK_TEMPLATES[0];
        setTitle(tpl.title);
        setRows(buildDefaultRows(tpl));
        toast.error('未能恢复上次内容，已打开默认模板', { id: 'tier-list-load-error' });
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 拖拽时不逐帧写盘；停止操作 500ms 后统一保存。
  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    const data: PersistedCanvasData = { title, rows, elements, templateId };
    saveTimerRef.current = window.setTimeout(() => {
      void saveCanvasData(data).catch((error) => {
        console.error('Failed to save canvas data:', error);
        toast.error('本地保存失败，请先导出图片再刷新页面', {
          id: 'tier-list-save-error',
          duration: 8000,
        });
      });
    }, 500);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [title, rows, elements, templateId, isLoaded]);

  // 标题
  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  // 等级行
  const addRow = useCallback(() => {
    const colorPalette = [
      '#FF4D4F',
      '#FF7A45',
      '#FFA940',
      '#FFD666',
      '#95DE64',
      '#69B1FF',
      '#B37FEB',
      '#8C8C8C',
    ];
    const newRow: ITierRow = {
      id: genId('row'),
      label: '新等级',
      color: colorPalette[rows.length % colorPalette.length],
      labelFontSize: 28,
      rowHeight: 120,
    };
    setRows((prev) => [...prev, newRow]);
    return newRow.id;
  }, [rows.length]);

  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }, []);

  const updateRowLabel = useCallback((rowId: string, label: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, label } : r)));
  }, []);

  const updateRowColor = useCallback((rowId: string, color: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, color } : r)));
  }, []);

  const updateRowLabelFontSize = useCallback((rowId: string, labelFontSize: number) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, labelFontSize } : r)));
  }, []);

  const moveRow = useCallback((fromIndex: number, toIndex: number) => {
    setRows((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  // 元素（统一画布，x/y 为相对右侧画布坐标）
  const getNextZ = useCallback(() => {
    maxZRef.current += 1;
    return maxZRef.current;
  }, []);

  const addTextElement = useCallback(
    (x: number, y: number, text: string) => {
      const newEl: ICanvasElement = {
        id: genId('el'),
        type: 'text',
        x,
        y,
        width: 140,
        height: 40,
        zIndex: getNextZ(),
        text,
        fontSize: 20,
        textColor: '#000000',
      };
      setElements((prev) => [...prev, newEl]);
      return newEl.id;
    },
    [getNextZ]
  );

  const addImageElement = useCallback(
    (x: number, y: number, imageDataUrl: string) => {
      const newEl: ICanvasElement = {
        id: genId('el'),
        type: 'image',
        x,
        y,
        width: 120,
        height: 120,
        zIndex: getNextZ(),
        image: imageDataUrl,
      };
      setElements((prev) => [...prev, newEl]);
      return newEl.id;
    },
    [getNextZ]
  );

  const deleteElement = useCallback((elementId: string) => {
    setElements((prev) => prev.filter((e) => e.id !== elementId));
  }, []);

  const updateElement = useCallback(
    (elementId: string, updates: Partial<ICanvasElement>) => {
      setElements((prev) =>
        prev.map((e) => (e.id === elementId ? { ...e, ...updates } : e))
      );
    },
    []
  );

  const bringForward = useCallback(
    (elementId: string) => {
      const newZ = getNextZ();
      setElements((prev) =>
        prev.map((e) => (e.id === elementId ? { ...e, zIndex: newZ } : e))
      );
    },
    [getNextZ]
  );

  const sendBackward = useCallback((elementId: string) => {
    setElements((prev) => {
      const el = prev.find((e) => e.id === elementId);
      if (!el) return prev;
      const below = prev
        .filter((e) => (e.zIndex || 0) < (el.zIndex || 0))
        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))[0];
      if (!below) return prev;
      const belowZ = below.zIndex || 0;
      return prev.map((e) => {
        if (e.id === elementId) return { ...e, zIndex: belowZ };
        if (e.id === below.id) return { ...e, zIndex: el.zIndex || 0 };
        return e;
      });
    });
  }, []);

  const bringToFront = useCallback(
    (elementId: string) => {
      const newZ = getNextZ();
      setElements((prev) =>
        prev.map((e) => (e.id === elementId ? { ...e, zIndex: newZ } : e))
      );
    },
    [getNextZ]
  );

  const sendToBack = useCallback((elementId: string) => {
    setElements((prev) => {
      const minZ = Math.min(...prev.map((e) => e.zIndex || 0), 0);
      const newZ = minZ - 1;
      return prev.map((e) => (e.id === elementId ? { ...e, zIndex: newZ } : e));
    });
  }, []);

  // 模板加载
  const loadTemplate = useCallback((id: string) => {
    const tpl = MOCK_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setTitle(tpl.title);
    setRows(buildDefaultRows(tpl));
    setElements([]);
    setTemplateId(id);
    maxZRef.current = 1;
  }, []);

  // 清空 / 重置
  const clearElements = useCallback(() => {
    setElements([]);
    maxZRef.current = 1;
  }, []);

  const resetToDefault = useCallback(() => {
    const tpl = MOCK_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID) || MOCK_TEMPLATES[0];
    setTitle(tpl.title);
    setRows(buildDefaultRows(tpl));
    setElements([]);
    setTemplateId(tpl.id);
    maxZRef.current = 1;
  }, []);

  return {
    title,
    rows,
    elements,
    templateId,
    isLoaded,
    templates: MOCK_TEMPLATES as ITierTemplate[],
    // 标题
    updateTitle,
    // 等级行
    addRow,
    deleteRow,
    updateRowLabel,
    updateRowColor,
    updateRowLabelFontSize,
    moveRow,
    // 元素
    addTextElement,
    addImageElement,
    deleteElement,
    updateElement,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    // 模板
    loadTemplate,
    // 清空重置
    clearElements,
    resetToDefault,
  };
}
