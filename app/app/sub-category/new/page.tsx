"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../lib/apiClient";
import {
  normalizeProductList,
  PRODUCT_LIST_ENDPOINT,
  type ProductListCategory,
} from "../../lib/productList";

type SubCategory = {
  _id?: string;
  subCategoryId: string;
  subCategoryName: string;
  categoryId: string;
};

type CategoryItem = { _id: string; categoryId: string; categoryName: string };

export default function NewSubCategoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subCategoryId, setSubCategoryId] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryListLoading, setCategoryListLoading] = useState(true);
  const [categoryListHint, setCategoryListHint] = useState<string | null>(null);
  const [categoryList, setCategoryList] = useState<CategoryItem[]>([]);
  const [productCategoryList, setProductCategoryList] = useState<
    ProductListCategory[]
  >([]);

  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      setCategoryListLoading(true);
      setCategoryListHint(null);
      try {
        const res = await apiClient.get<CategoryItem[]>("/category");
        if (!active) return;
        if (Array.isArray(res.data)) {
          setCategoryList(res.data);
          setProductCategoryList([]);
          setCategoryListHint(null);
          setCategoryListLoading(false);
          return;
        }
      } catch {
        // fallback to product list
      }
      try {
        const res = await apiClient.get(PRODUCT_LIST_ENDPOINT);
        if (!active) return;
        setProductCategoryList(normalizeProductList(res.data));
        setCategoryList([]);
        setCategoryListHint("ใช้รายการหมวดหมู่จาก Product Demo");
      } catch {
        if (!active) return;
        setCategoryList([]);
        setProductCategoryList([]);
        setCategoryListHint(
          "โหลดรายการหมวดหมู่ไม่สำเร็จ (สามารถกรอก Category ID เองได้)",
        );
      } finally {
        if (active) setCategoryListLoading(false);
      }
    };
    void fetchCategories();
    return () => {
      active = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const raw: Array<{ categoryId: string; categoryName: string }> = [];

    for (const c of categoryList) {
      raw.push({ categoryId: c.categoryId, categoryName: c.categoryName });
    }
    for (const c of productCategoryList) {
      raw.push({ categoryId: c.categoryId, categoryName: c.categoryName });
    }

    const dedup = new Map<
      string,
      { categoryId: string; categoryName: string }
    >();
    for (const item of raw) {
      const key = item.categoryId?.trim();
      if (!key) continue;
      if (!dedup.has(key)) dedup.set(key, item);
    }

    return Array.from(dedup.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName),
    );
  }, [categoryList, productCategoryList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiClient.post<SubCategory>("/sub-category", {
        subCategoryId: subCategoryId.trim(),
        subCategoryName: subCategoryName.trim(),
        categoryId: categoryId.trim(),
      });
      router.push("/sub-category");
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as Error).message)
          : "เกิดข้อผิดพลาด",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          เพิ่มหมวดหมู่ย่อย
        </h1>
        <Link
          href="/sub-category"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ย้อนกลับ
        </Link>
      </div>
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Sub Category ID *
            </label>
            <input
              type="text"
              required
              value={subCategoryId}
              onChange={(e) => setSubCategoryId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              ชื่อหมวดหมู่ย่อย *
            </label>
            <input
              type="text"
              required
              value={subCategoryName}
              onChange={(e) => setSubCategoryName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">
              Category ID *
            </label>
            {categoryListLoading || categoryOptions.length > 0 ? (
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  {categoryListLoading
                    ? "กำลังโหลดรายการหมวดหมู่..."
                    : "เลือกหมวดหมู่"}
                </option>
                {categoryOptions.map((item) => (
                  <option key={item.categoryId} value={item.categoryId}>
                    {item.categoryName} ({item.categoryId})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            )}
            {categoryListHint ? (
              <p className="mt-1 text-xs text-gray-500">{categoryListHint}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-4 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          <Link
            href="/sub-category"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
