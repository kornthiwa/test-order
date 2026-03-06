"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pagination } from "../components/Pagination";
import { OrderFilters, OrderFiltersValue } from "../components/SearchInput";
import { apiClient } from "../lib/apiClient";
import { getOrderApiId, type Order } from "../lib/orderTypes";

const PAGE_SIZE = 10;

type CategoryOption = { id: string; name: string };
type SubCategoryOption = { id: string; name: string; categoryId: string };

type OrderListResponse = {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentPage: number;
  startIndex: number;
  totalMatchingItems?: number | null;
};

const defaultFilters: OrderFiltersValue = {
  dateFrom: "",
  dateTo: "",
  orderType: "",
  categoryId: "",
  subCategoryId: "",
  orderId: "",
  orderIdMatchMode: "contains",
  priceMin: "",
  priceMax: "",
  grade: "ALL",
};

function buildOrderListParams(
  filters: OrderFiltersValue,
  page: number,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page,
    pageSize: PAGE_SIZE,
    orderIdMatchMode: filters.orderIdMatchMode,
    grade: filters.grade,
  };
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.orderType) params.orderType = filters.orderType;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.subCategoryId) params.subCategoryId = filters.subCategoryId;
  if (filters.orderId) params.orderId = filters.orderId;
  if (filters.priceMin) params.priceMin = filters.priceMin;
  if (filters.priceMax) params.priceMax = filters.priceMax;
  return params;
}

export default function Orders() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<OrderFiltersValue>(defaultFilters);
  const [listData, setListData] = useState<OrderListResponse | null>(null);
  const [useOrderCrud, setUseOrderCrud] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);

  const fetchOrders = useCallback(async (f: OrderFiltersValue, p: number) => {
    try {
      const params = buildOrderListParams(f, p);
      const res = await apiClient.get<OrderListResponse>("/order/list", {
        params,
      });
      const data = res.data as OrderListResponse;
      if (data?.items != null && Array.isArray(data.items)) {
        setListData(data);
        setUseOrderCrud(true);
        return;
      }
    } catch {
      setListData(null);
      setUseOrderCrud(false);
    }
  }, []);

  const fetchCategoryOptions = useCallback(async () => {
    try {
      const res =
        await apiClient.get<{ categoryId: string; categoryName?: string }[]>(
          "/category",
        );
      const list = Array.isArray(res.data) ? res.data : [];
      setCategories(
        list.map((c) => ({
          id: c.categoryId,
          name: c.categoryName ?? c.categoryId,
        })),
      );
    } catch {
      setCategories([]);
    }
  }, []);

  const fetchSubCategoryOptions = useCallback(async () => {
    try {
      const res = await apiClient.get<
        {
          subCategoryId: string;
          subCategoryName?: string;
          categoryId: string;
        }[]
      >("/sub-category", {
        params: filters.categoryId ? { categoryId: filters.categoryId } : {},
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setSubCategories(
        list.map((s) => ({
          id: s.subCategoryId,
          name: s.subCategoryName ?? s.subCategoryId,
          categoryId: s.categoryId,
        })),
      );
    } catch {
      setSubCategories([]);
    }
  }, [filters.categoryId]);

  useEffect(() => {
    void fetchOrders(filters, 1);
  }, [fetchOrders]);

  useEffect(() => {
    if (useOrderCrud && page > 1) {
      void fetchOrders(filters, page);
    }
  }, [page, useOrderCrud, fetchOrders]);

  useEffect(() => {
    if (useOrderCrud) {
      void fetchCategoryOptions();
      void fetchSubCategoryOptions();
    }
  }, [useOrderCrud, fetchCategoryOptions, fetchSubCategoryOptions]);

  const {
    items: pageItems = [],
    total: paginationTotal = 0,
    currentPage = 1,
    totalPages: paginationTotalPages = 1,
    startIndex = 0,
    totalMatchingItems = null,
  } = listData ?? {};

  const displaySubCategories = filters.categoryId
    ? subCategories.filter((s) => s.categoryId === filters.categoryId)
    : subCategories;

  const getDisplayTotalForOrder = (order: Order) => {
    let sum = 0;
    (order.requestList ?? []).forEach((cat) => {
      (cat.requestList ?? []).forEach((item) => {
        if (filters.grade !== "ALL" && item.grade !== filters.grade) return;
        sum += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      });
    });
    return sum;
  };

  const handleApplyFilters = () => {
    setPage(1);
    void fetchOrders(filters, 1);
  };

  const handleDelete = async (order: Order) => {
    const apiId = getOrderApiId(order);
    if (!apiId || apiId === order.orderId) return;
    if (!confirm("ต้องการลบออเดอร์นี้ใช่หรือไม่?")) return;
    try {
      await apiClient.delete(`/order/${apiId}`);
      void fetchOrders(filters, page);
      setPage(1);
    } catch (err) {
      console.error("Delete failed", err);
      alert("ลบไม่สำเร็จ");
    }
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
    void fetchOrders(defaultFilters, 1);
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          {useOrderCrud && (
            <Link
              href="/orders/new"
              className="bg-primary text-white px-3 py-1.5 border border-primary rounded-md"
            >
              + เพิ่มออเดอร์
            </Link>
          )}
        </div>
        <div className="text-xs text-gray-500">
          ผลลัพธ์ทั้งหมด: {paginationTotal} ออเดอร์
          {filters.grade !== "ALL" &&
            typeof totalMatchingItems === "number" && (
              <span>
                {" "}
                · รายการเกรด {filters.grade}: {totalMatchingItems}
              </span>
            )}
        </div>
      </div>

      <OrderFilters
        value={filters}
        categories={categories}
        subCategories={displaySubCategories}
        onChange={(next) => setFilters(next)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Order ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                วันที่
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                หมวดหมู่ / ย่อย
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ประเภท
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ผู้ขาย
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                รวมยอด (ตามเกรด)
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                การจัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pageItems.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  ไม่พบรายการตามตัวกรอง
                </td>
              </tr>
            ) : (
              pageItems.map((order) => {
                const total = getDisplayTotalForOrder(order);
                const categoriesLabel = (order.requestList ?? [])
                  .map((c) => `${c.categoryID}/${c.subCategoryID}`)
                  .join(", ");
                const detailId = getOrderApiId(order);

                return (
                  <tr key={order.orderId}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {order.orderId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {order.orderFinishedDate ?? "-"}{" "}
                      {order.orderFinishedTime ?? ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {categoriesLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {order.orderType === "buy" ? "ซื้อ" : "ขาย"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {order.transactionParties?.customer?.name ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                      ฿
                      {total.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/orders/${detailId}`}
                          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          ดูรายละเอียด
                        </Link>
                        <Link
                          href={`/orders/${detailId}?edit=1`}
                          className="inline-flex items-center rounded-md border border-secondary px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          แก้ไข
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(order)}
                          className="inline-flex items-center rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={paginationTotalPages}
          startIndex={startIndex}
          pageItemsCount={pageItems.length}
          totalItems={paginationTotal}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
