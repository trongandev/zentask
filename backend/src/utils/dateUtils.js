// Utilities for dates
export const getWeekString = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1 = Mon, 7 = Sun
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

export const getMonthString = (date = new Date()) => {
  return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
};

// Also calculate "last week" and "last month"
export const getLastWeekString = (date = new Date()) => {
  const lastWeek = new Date(date);
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);
  return getWeekString(lastWeek);
};

export const getLastMonthString = (date = new Date()) => {
  const lastMonth = new Date(date);
  lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
  return getMonthString(lastMonth);
};
