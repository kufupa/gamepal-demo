// Format a decimal inch value (e.g. 27.625) as "27 5/8"'"
export function formatInches(decimal) {
  if (decimal == null || decimal === '' || isNaN(decimal)) return '';
  const whole = Math.floor(decimal);
  const eighths = Math.round((decimal - whole) * 8);
  if (eighths === 8) return `${whole + 1}"`;
  if (eighths === 0) return `${whole}"`;
  return `${whole} ${eighths}/8"`;
}

// Parse a string like "27 5/8" or "27.625" into a decimal number.
export function parseInches(str) {
  if (str == null || str === '') return null;
  if (typeof str === 'number') return str;
  const match = String(str).match(/(\d+)\s+(\d+)\s*\/\s*8/);
  if (match) return parseInt(match[1]) + parseInt(match[2]) / 8;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Whether a measurement object has any actual data.
export function hasMeasurementData(m) {
  if (!m) return false;
  return ['inches', 'horn_length_left', 'horn_length_right', 'tip_to_tip', 'tips_left', 'tips_right', 'rings_left', 'rings_right', 'base_left', 'base_right']
    .some((k) => m[k] != null && m[k] !== '');
}