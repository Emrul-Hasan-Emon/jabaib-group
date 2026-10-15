/**
 * Human-readable variant label for a SKU, e.g. "M / Red".
 *
 * Shared by the cart and the checkout preview so both expose the same string
 * under the same field name (the preview used to leak the raw `skuData` JSON,
 * which broke the `skuLabel: string` contract the web client relies on).
 */
export function skuLabel(sku?: {
  skuVariants?: { attributeValue?: { name?: string | null } | null }[] | null;
}): string {
  return (sku?.skuVariants ?? [])
    .map((v) => v?.attributeValue?.name ?? '')
    .filter(Boolean)
    .join(' / ');
}