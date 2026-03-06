export type ProductListSubcategory = {
  subCategoryId: string;
  subCategoryName: string;
};

export type ProductListCategory = {
  categoryId: string;
  categoryName: string;
  subcategory: ProductListSubcategory[];
};

type ProductListApiResponse = {
  success?: boolean;
  productList?: ProductListCategory[];
};

export function normalizeProductList(raw: unknown): ProductListCategory[] {
  if (Array.isArray(raw)) return raw.map(normalizeCategory);
  if (raw && typeof raw === "object" && "productList" in raw) {
    const data = raw as ProductListApiResponse;
    if (Array.isArray(data.productList)) {
      return data.productList.map(normalizeCategory);
    }
  }
  return [];
}

function normalizeCategory(c: {
  categoryId: string;
  categoryName: string;
  subcategory?: ProductListSubcategory[];
  subCategory?: ProductListSubcategory[];
}): ProductListCategory {
  return {
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    subcategory: c.subcategory ?? c.subCategory ?? [],
  };
}

export const PRODUCT_LIST_ENDPOINT = "/category/query-product-demo";
