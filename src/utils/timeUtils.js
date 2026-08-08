/**
 * Parse a human duration string (e.g. "30 mins", "1.5 hrs", "45m", "1h 20m") to total minutes.
 */
export function parseDurationToMinutes(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const str = durationStr.toLowerCase().trim();
  
  let totalMinutes = 0;
  
  // Hours match (e.g., 1.5 hr, 2 hrs, 1h)
  const hrMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours|h)/);
  if (hrMatch) {
    totalMinutes += parseFloat(hrMatch[1]) * 60;
  }

  // Minutes match (e.g., 30 mins, 45 min, 20m)
  const minMatch = str.match(/(\d+)\s*(?:min|mins|minute|minutes|m)(?!\w)/);
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
  }

  // Pure number fallback (assume minutes if no unit specified, e.g. "30")
  if (totalMinutes === 0) {
    const numOnlyMatch = str.match(/^(\d+)$/);
    if (numOnlyMatch) {
      totalMinutes = parseInt(numOnlyMatch[1], 10);
    }
  }

  return Math.round(totalMinutes);
}

/**
 * Format minutes into human-readable duration string (e.g. "45 mins" or "1 hr 15 mins")
 */
export function formatMinutesToDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0 && mins > 0) {
    return `${hrs} hr ${mins} mins`;
  } else if (hrs > 0) {
    return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  } else {
    return `${mins} mins`;
  }
}

/**
 * Calculate duration string between two Date objects or datetime strings
 */
export function calculateDurationBetween(startDateVal, endDateVal) {
  if (!startDateVal || !endDateVal) return '';
  const start = new Date(startDateVal);
  const end = new Date(endDateVal);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '';

  const minutes = Math.round(diffMs / (1000 * 60));
  return formatMinutesToDuration(minutes);
}

/**
 * Calculate end Date / ISO string from start Date + duration string
 */
export function calculateEndTimeFromDuration(startDateVal, durationStr) {
  const start = startDateVal ? new Date(startDateVal) : new Date();
  if (isNaN(start.getTime())) return new Date();

  const minutes = parseDurationToMinutes(durationStr);
  return new Date(start.getTime() + minutes * 60 * 1000);
}
