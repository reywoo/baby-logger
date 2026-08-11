/**
 * Calculate precise baby age in Years - Months - Days
 */
export function calculateBabyAge(birthDateStr, lang = 'zh') {
  if (!birthDateStr) return null;

  // Parse YYYY-MM-DD string cleanly without timezone distortion
  const parts = String(birthDateStr).slice(0, 10).split('-');
  if (parts.length !== 3) return null;

  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed month
  const birthDay = parseInt(parts[2], 10);

  const birthDate = new Date(birthYear, birthMonth, birthDay);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (isNaN(birthDate.getTime()) || birthDate > today) {
    return lang === 'zh' ? '0天 (刚出生)' : '0 Days (Newborn)';
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    // Days in previous month
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (lang === 'zh') {
    const partsZh = [];
    if (years > 0) partsZh.push(`${years}岁`);
    if (months > 0) partsZh.push(`${months}个月`);
    if (days > 0 || (years === 0 && months === 0)) partsZh.push(`${days}天`);
    return partsZh.join(' ');
  } else {
    const partsEn = [];
    if (years > 0) partsEn.push(`${years} ${years === 1 ? 'Yr' : 'Yrs'}`);
    if (months > 0) partsEn.push(`${months} ${months === 1 ? 'Mo' : 'Mos'}`);
    if (days > 0 || (years === 0 && months === 0)) partsEn.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
    return partsEn.join(' ');
  }
}
