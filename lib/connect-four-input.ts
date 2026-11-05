export function keyboardColumn(event: {
  key: string; repeat?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; isComposing?: boolean;
}, editing: boolean): number | null {
  if (editing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.isComposing || !/^[1-7]$/.test(event.key)) return null;
  return Number(event.key) - 1;
}
