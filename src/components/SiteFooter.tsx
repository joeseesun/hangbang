import { useState } from 'react';
import { Github, Heart, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ModalType = 'reward' | 'follow' | null;

export default function SiteFooter() {
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <footer className="border-t border-white/8 px-4 py-5 text-sm text-white/60 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <p>夯榜 · 数据只保存在你的浏览器</p>
        <nav className="flex flex-wrap items-center gap-1" aria-label="站点链接">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/65 hover:bg-white/8 hover:text-white"
            onClick={() => setModal('reward')}
            aria-label="打赏支持"
            title="打赏支持"
          >
            <Heart aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/65 hover:bg-white/8 hover:text-white"
            onClick={() => setModal('follow')}
            aria-label="关注向阳乔木"
            title="关注向阳乔木"
          >
            <MessageCircle aria-hidden="true" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white/65 hover:bg-white/8 hover:text-white" asChild>
            <a href="https://github.com/joeseesun/" target="_blank" rel="noreferrer" aria-label="GitHub">
              <Github aria-hidden="true" />
            </a>
          </Button>
          <a
            href="https://x.com/vista8"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-2 py-1.5 font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            X
          </a>
          <a
            href="https://tuijian.qiaomu.ai/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-white/65 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            乔木推荐
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </nav>
      </div>

      <Dialog open={modal === 'reward'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>打赏支持</DialogTitle>
            <DialogDescription>如果夯榜帮你省了时间，可以请乔木喝杯咖啡。</DialogDescription>
          </DialogHeader>
          <img
            src="/assets/qiaomu_reward_qr.png"
            alt="向阳乔木打赏二维码"
            width="640"
            height="640"
            loading="lazy"
            className="mx-auto aspect-square w-full max-w-72 rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'follow'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>关注向阳乔木</DialogTitle>
            <DialogDescription>微信公众号「向阳乔木推荐看」，分享实用 AI 工具与方法。</DialogDescription>
          </DialogHeader>
          <img
            src="/assets/qiaomu_wechat_public_account_qr.jpg"
            alt="微信公众号向阳乔木推荐看二维码"
            width="430"
            height="430"
            loading="lazy"
            className="mx-auto aspect-square w-full max-w-72 rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </footer>
  );
}
