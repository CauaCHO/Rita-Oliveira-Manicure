import { HOURS, uid } from './utils.js';

export const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

function sortedUnique(hours) {
  return Array.from(new Set(hours.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function getWeekday(dateISO) {
  return new Date(`${dateISO}T12:00:00`).getDay();
}

export function getAgendaHours(Store, dateISO) {
  const settings = Store.getSettings();
  const weekday = getWeekday(dateISO);
  let hours = Array.isArray(settings.defaultHours) && settings.defaultHours.length ? [...settings.defaultHours] : [...HOURS];

  (settings.dateSlots || [])
    .filter(slot => slot.date === dateISO)
    .forEach(slot => hours.push(slot.hora));

  (settings.weeklySlots || [])
    .filter(slot => Number(slot.weekday) === weekday)
    .forEach(slot => hours.push(slot.hora));

  const hidden = new Set();
  (settings.hiddenDateSlots || [])
    .filter(slot => slot.date === dateISO)
    .forEach(slot => hidden.add(slot.hora));

  (settings.hiddenWeeklySlots || [])
    .filter(slot => Number(slot.weekday) === weekday)
    .forEach(slot => hidden.add(slot.hora));

  return sortedUnique(hours).filter(hour => !hidden.has(hour));
}

export function addDateSlot(Store, date, hora) {
  const settings = Store.getSettings();
  const dateSlots = [...(settings.dateSlots || []), { id: uid('slot_dia'), date, hora }];
  const hiddenDateSlots = (settings.hiddenDateSlots || []).filter(slot => !(slot.date === date && slot.hora === hora));
  Store.updateSettings({ dateSlots, hiddenDateSlots });
}

export function addWeeklySlot(Store, weekday, hora) {
  const settings = Store.getSettings();
  const weeklySlots = [...(settings.weeklySlots || []), { id: uid('slot_semana'), weekday: Number(weekday), hora }];
  const hiddenWeeklySlots = (settings.hiddenWeeklySlots || []).filter(slot => !(Number(slot.weekday) === Number(weekday) && slot.hora === hora));
  Store.updateSettings({ weeklySlots, hiddenWeeklySlots });
}

export function removeDateSlot(Store, date, hora) {
  const settings = Store.getSettings();
  const dateSlots = (settings.dateSlots || []).filter(slot => !(slot.date === date && slot.hora === hora));
  const hiddenDateSlots = [...(settings.hiddenDateSlots || []), { id: uid('hide_dia'), date, hora }];
  Store.updateSettings({ dateSlots, hiddenDateSlots });
}

export function removeWeeklySlot(Store, weekday, hora) {
  const settings = Store.getSettings();
  const weeklySlots = (settings.weeklySlots || []).filter(slot => !(Number(slot.weekday) === Number(weekday) && slot.hora === hora));
  const hiddenWeeklySlots = [...(settings.hiddenWeeklySlots || []), { id: uid('hide_semana'), weekday: Number(weekday), hora }];
  Store.updateSettings({ weeklySlots, hiddenWeeklySlots });
}

export function weekdayLabel(value) {
  return WEEKDAYS.find(day => Number(day.value) === Number(value))?.label || 'Dia da semana';
}
