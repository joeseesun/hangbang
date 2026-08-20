import { Eye } from 'lucide-react';

interface RecordingExitButtonProps {
  onExit: () => void;
}

export default function RecordingExitButton({ onExit }: RecordingExitButtonProps) {
  return (
    <button
      type="button"
      onClick={onExit}
      className="fixed right-3 top-3 z-[60] flex size-11 items-center justify-center rounded-md border border-white/15 bg-[#15171D]/88 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150 hover:delay-500 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label="退出录屏模式（Esc）"
      data-recording-exit
    >
      <Eye className="size-5" aria-hidden="true" />
    </button>
  );
}
