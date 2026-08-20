// EXPORTS: ICanvasElement, ITierRow, ITierTemplate, MOCK_TEMPLATES
export interface ICanvasElement {
  id: string
  type: 'text' | 'image'
  /** 相对于右侧整块画布的 x 坐标（px） */
  x: number
  /** 相对于右侧整块画布的 y 坐标（px） */
  y: number
  width: number
  height: number
  /** 层级 z-index */
  zIndex: number
  /** 文字内容（type=text 时） */
  text?: string
  /** 文字字号（type=text 时） */
  fontSize?: number
  /** 文字颜色（type=text 时） */
  textColor?: string
  /** 图片 dataURL（type=image 时） */
  image?: string
}

export interface ITierRow {
  id: string
  label: string
  color: string
  /** 等级标签字号（px） */
  labelFontSize?: number
  /** 行高（px） */
  rowHeight?: number
}

export interface ITierTemplate {
  id: string
  name: string
  description: string
  title: string
  rows: ITierRow[]
}

export const MOCK_TEMPLATES: ITierTemplate[] = [
  {
    id: 'hang',
    name: '夯系列',
    description: '夯 / 顶级 / 人上人 / NPC / 拉完了',
    title: '我的梯队排行',
    rows: [
      { id: 'r1', label: '夯', color: '#EA6048', labelFontSize: 42, rowHeight: 120 },
      { id: 'r2', label: '顶级', color: '#F2B85C', labelFontSize: 40, rowHeight: 120 },
      { id: 'r3', label: '人上人', color: '#F9E65A', labelFontSize: 40, rowHeight: 120 },
      { id: 'r4', label: 'NPC', color: '#F8EFD6', labelFontSize: 40, rowHeight: 120 },
      { id: 'r5', label: '拉完了', color: '#F5F5E9', labelFontSize: 36, rowHeight: 120 },
    ],
  },
  {
    id: 'sabcd',
    name: '标准 SABCD',
    description: '经典五级梯队模板',
    title: '我的梯队排行',
    rows: [
      { id: 'r1', label: 'S', color: '#FF4D4F', labelFontSize: 48, rowHeight: 120 },
      { id: 'r2', label: 'A', color: '#FF7A45', labelFontSize: 44, rowHeight: 120 },
      { id: 'r3', label: 'B', color: '#FFA940', labelFontSize: 40, rowHeight: 120 },
      { id: 'r4', label: 'C', color: '#FFD666', labelFontSize: 36, rowHeight: 120 },
      { id: 'r5', label: 'D', color: '#95DE64', labelFontSize: 32, rowHeight: 120 },
    ],
  },
  {
    id: 'game',
    name: '游戏角色排行',
    description: '游戏角色强度评级模板',
    title: '游戏角色强度榜',
    rows: [
      { id: 'r1', label: 'T0 天花板', color: '#FF4D4F', labelFontSize: 28, rowHeight: 120 },
      { id: 'r2', label: 'T1 强力', color: '#FF7A45', labelFontSize: 28, rowHeight: 120 },
      { id: 'r3', label: 'T2 中规', color: '#FFA940', labelFontSize: 28, rowHeight: 120 },
      { id: 'r4', label: 'T3 仓管', color: '#FFD666', labelFontSize: 28, rowHeight: 120 },
      { id: 'r5', label: 'T4 下水道', color: '#8C8C8C', labelFontSize: 28, rowHeight: 120 },
    ],
  },
  {
    id: 'food',
    name: '美食评级',
    description: '美食喜好分级模板',
    title: '我的美食图鉴',
    rows: [
      { id: 'r1', label: '神级', color: '#FF4D4F', labelFontSize: 32, rowHeight: 120 },
      { id: 'r2', label: '爱吃', color: '#FF7A45', labelFontSize: 32, rowHeight: 120 },
      { id: 'r3', label: '还行', color: '#FFA940', labelFontSize: 32, rowHeight: 120 },
      { id: 'r4', label: '一般', color: '#FFD666', labelFontSize: 32, rowHeight: 120 },
      { id: 'r5', label: '不爱吃', color: '#95DE64', labelFontSize: 28, rowHeight: 120 },
      { id: 'r6', label: '避雷', color: '#8C8C8C', labelFontSize: 28, rowHeight: 120 },
    ],
  },
]
