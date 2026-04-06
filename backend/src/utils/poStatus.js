export function derivePOStatus(poTotal, invoicedTotal) {
  if (Number(invoicedTotal) <= 0) return 'OPEN';
  if (Number(invoicedTotal) >= Number(poTotal)) return 'FULLY_INVOICED';
  return 'PARTIAL';
}
