"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { apiClient } from "../lib/apiClient";
import {
  normalizeProductList,
  PRODUCT_LIST_ENDPOINT,
  type ProductListCategory,
} from "../lib/productList";

type CategoryItem = { _id: string; categoryId: string; categoryName: string };

const PAGE_SIZE = 10;
const TH_CLASS =
  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500";

export default function Category() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryList, setCategoryList] = useState<CategoryItem[]>([]);
  const [productList, setProductList] = useState<ProductListCategory[]>([]);
  const [useCategoryCrud, setUseCategoryCrud] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get<CategoryItem[]>("/category");
      if (Array.isArray(res.data)) {
        setCategoryList(res.data);
        setUseCategoryCrud(true);
        return;
      }
    } catch {
      // fallback to product list
    }
    try {
      const res = await apiClient.get(PRODUCT_LIST_ENDPOINT);
      setProductList(normalizeProductList(res.data));
      setUseCategoryCrud(false);
    } catch (error) {
      console.error("Failed to fetch product list", error);
      setProductList([]);
      setUseCategoryCrud(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const filteredByCrud = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryList;
    return categoryList.filter(
      (item) =>
        item.categoryId.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q),
    );
  }, [categoryList, searchQuery]);

  const filteredByProduct = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return productList;
    return productList.filter(
      (item) =>
        item.categoryId.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q),
    );
  }, [productList, searchQuery]);

  const list = useCategoryCrud ? filteredByCrud : filteredByProduct;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = list.slice(startIndex, startIndex + PAGE_SIZE);

  const handleSearchChange = (v: string) => {
    setSearchQuery(v);
    setPage(1);
  };

  const handleDelete = async (item: CategoryItem) => {
    if (!item._id) return;
    if (!confirm("ต้องการลบหมวดหมู่นี้ใช่หรือไม่?")) return;
    try {
      await apiClient.delete(`/category/${item._id}`);
      await fetchCategories();
      setPage(1);
    } catch (err) {
      console.error("Delete failed", err);
      alert("ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Category</h1>
          {useCategoryCrud && (
            <Link
              href="/category/new"
              className="bg-primary text-white px-3 py-1.5 border border-primary rounded-md"
            >
              + เพิ่มหมวดหมู่
            </Link>
          )}
        </div>
        <span className="text-xs text-gray-500">
          ผลลัพธ์ทั้งหมด: {list.length} รายการ
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <SearchInput
          value={searchQuery}
          placeholder="ค้นหา..."
          onChange={handleSearchChange}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className={TH_CLASS}>Category ID</th>
              <th className={TH_CLASS}>Category Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pageItems.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  ไม่พบรายการตามตัวกรอง
                </td>
              </tr>
            ) : useCategoryCrud ? (
              (pageItems as CategoryItem[]).map((item) => (
                <tr key={item._id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {item.categoryId}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.categoryName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/category/${item._id}/edit`}
                        className="rounded-md border border-secondary px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        แก้ไข
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              (pageItems as ProductListCategory[]).map((item) => (
                <tr key={item.categoryId}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {item.categoryId}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.categoryName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                    {item.subcategory.length}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          pageItemsCount={pageItems.length}
          totalItems={list.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
