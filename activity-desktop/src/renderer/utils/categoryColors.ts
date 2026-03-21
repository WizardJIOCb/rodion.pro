export const CATEGORY_COLORS: Record<string, string> = {
  coding: '#4fc3f7',
  browser: '#ff9800',
  comms: '#ab47bc',
  meetings: '#ef5350',
  productivity: '#66bb6a',
  office: '#5c6bc0',
  design: '#ec407a',
  media: '#26a69a',
  games: '#d4e157',
  devops: '#8d6e63',
  system: '#78909c',
  entertainment: '#ff7043',
  utilities: '#bdbdbd',
  unknown: '#616161',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#616161';
}
