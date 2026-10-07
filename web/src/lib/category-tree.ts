/**
 * Category tree helpers for admin pickers.
 *
 * The admin `/v1/admin/category/tree` endpoint returns the full category tree
 * as a bare array (no pagination cap), each node carrying a nested
 * `childrenNodes` array. Admin forms need a flat, tree-ordered list to build
 * indented `<option>` lists, so we flatten it here.
 */

export interface CategoryTree {
  id: number;
  name: string;
  parentId: number | null;
  childrenNodes?: CategoryTree[];
}

export interface FlatCategory {
  id: number;
  name: string;
  parentId: number | null;
  /** Name of the direct parent (null for roots) — for "Parent / Child" labels. */
  parentName: string | null;
}

/** Flatten a nested category tree into a depth-first flat list in tree order. */
export function flattenCategoryTree(nodes: CategoryTree[]): FlatCategory[] {
  const out: FlatCategory[] = [];
  const walk = (node: CategoryTree, parentName: string | null) => {
    out.push({
      id: node.id,
      name: node.name,
      parentId: node.parentId ?? null,
      parentName,
    });
    for (const child of node.childrenNodes ?? []) walk(child, node.name);
  };
  for (const node of nodes ?? []) walk(node, null);
  return out;
}