import { Cell, CellType, ColorGroup } from '../../shared/types';

/**
 * 棋盘配置 - 20个格子的环形棋盘
 * 包含：起点、地产、机会、命运、入狱、监狱、免费停车、税务
 */
export const BOARD_CELLS: Cell[] = [
  { id: 0, name: '起点', type: CellType.START },
  { id: 1, name: '地中海大道', type: CellType.PROPERTY, price: 60, rent: 2, colorGroup: ColorGroup.BROWN },
  { id: 2, name: '机会', type: CellType.CHANCE },
  { id: 3, name: '波罗的海大道', type: CellType.PROPERTY, price: 60, rent: 4, colorGroup: ColorGroup.BROWN },
  { id: 4, name: '所得税', type: CellType.TAX, taxAmount: 200 },
  { id: 5, name: '阅读铁路', type: CellType.PROPERTY, price: 200, rent: 25 },
  { id: 6, name: '东方大道', type: CellType.PROPERTY, price: 100, rent: 6, colorGroup: ColorGroup.LIGHT_BLUE },
  { id: 7, name: '命运', type: CellType.FATE },
  { id: 8, name: '佛蒙特大道', type: CellType.PROPERTY, price: 100, rent: 6, colorGroup: ColorGroup.LIGHT_BLUE },
  { id: 9, name: '康州大道', type: CellType.PROPERTY, price: 120, rent: 8, colorGroup: ColorGroup.LIGHT_BLUE },
  { id: 10, name: '入狱（路过）', type: CellType.JAIL_VISIT },
  { id: 11, name: '圣查尔斯', type: CellType.PROPERTY, price: 140, rent: 10, colorGroup: ColorGroup.PINK },
  { id: 12, name: '机会', type: CellType.CHANCE },
  { id: 13, name: '国家大道', type: CellType.PROPERTY, price: 140, rent: 10, colorGroup: ColorGroup.PINK },
  { id: 14, name: '命运', type: CellType.FATE },
  { id: 15, name: '监狱', type: CellType.JAIL },
  { id: 16, name: '圣詹姆斯', type: CellType.PROPERTY, price: 180, rent: 14, colorGroup: ColorGroup.ORANGE },
  { id: 17, name: '公司税', type: CellType.TAX, taxAmount: 100 },
  { id: 18, name: '田纳西大道', type: CellType.PROPERTY, price: 180, rent: 14, colorGroup: ColorGroup.ORANGE },
  { id: 19, name: '免费停车', type: CellType.FREE_PARKING },
];

/** 颜色组对应的显示颜色 */
export const COLOR_GROUP_COLORS: Record<ColorGroup, string> = {
  [ColorGroup.BROWN]: '#8B4513',
  [ColorGroup.LIGHT_BLUE]: '#87CEEB',
  [ColorGroup.PINK]: '#FF69B4',
  [ColorGroup.ORANGE]: '#FFA500',
  [ColorGroup.RED]: '#FF0000',
  [ColorGroup.YELLOW]: '#FFD700',
  [ColorGroup.GREEN]: '#008000',
  [ColorGroup.DARK_BLUE]: '#00008B',
};

/** 玩家棋子颜色 */
export const PLAYER_COLORS = ['#FF4444', '#4444FF', '#44BB44', '#FFBB00'];
