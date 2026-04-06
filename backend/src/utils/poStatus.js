export function derivePOStatus(poTotal, invoicedTotal, existingStatus = 'OPEN') {
  if (existingStatus === 'CLOSED' || existingStatus === 'CANCELLED') return existingStatus;
  if (Number(invoicedTotal) <= 0) return 'OPEN';
  if (Number(invoicedTotal) >= Number(poTotal)) return 'FULLY_INVOICED';
  return 'PARTIALLY_INVOICED';
}
