/**
 * Currency formatter helper using Indian Numbering System
 * e.g., 200000 -> ₹2,00,000
 */
export function formatINR(val, includeSymbol = true) {
  const num = Number(val);
  if (isNaN(num)) return includeSymbol ? '₹0' : '0';
  
  // Round to nearest integer for clean dashboard views
  const formatted = Math.round(num).toLocaleString('en-IN');
  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Decimal formatter helper for smaller decimal values
 */
export function formatINRDecimal(val, includeSymbol = true) {
  const num = Number(val);
  if (isNaN(num)) return includeSymbol ? '₹0.00' : '0.00';
  
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format percentage
 */
export function formatPercent(val) {
  const num = Number(val);
  if (isNaN(num)) return '0%';
  return `${num.toFixed(1)}%`;
}

/**
 * Format date to a readable standard
 */
export function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
