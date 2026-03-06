"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { apiClient } from "../lib/apiClient";
import {
  normalizeProductList,
  PRODUCT_LIST_ENDPOINT,
  type ProductListCategory,
} from "../lib/productList";

const PAGE_SIZE = 10;
const TH_CLASS =
  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500";

export default function Category() {
  const [page, setPage] = useState(1);
  const [productList, setProductList] = useState<ProductListCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await apiClient.get(PRODUCT_LIST_ENDPOINT);
        setProductList(normalizeProductList(res.data));
      } catch (error) {
        console.error("Failed to fetch product list", error);
        setProductList([]);
      }
    };
    void fetchList();
  }, []);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return productList;
    return productList.filter(
      (item) =>
        item.categoryId.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q),
    );
  }, [productList, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredList.slice(startIndex, startIndex + PAGE_SIZE);

  const handleSearchChange = (v: string) => {
    setSearchQuery(v);
    setPage(1);
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Category</h1>
        <span className="text-xs text-gray-500">
          ผลลัพธ์ทั้งหมด: {filteredList.length} รายการ
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
              <th className={`${TH_CLASS} text-right`}>จำนวนหมวดหมู่ย่อย</th>
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
            ) : (
              pageItems.map((item) => (
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
          totalItems={filteredList.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
