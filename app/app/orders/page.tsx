"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "../components/Pagination";
import { OrderFilters, OrderFiltersValue } from "../components/SearchInput";
import { apiClient } from "../lib/apiClient";

type Grade = "A" | "B" | "C" | "D";

type GradeRequest = {
  grade: Grade;
  price: number;
  quantity: string;
  total: number;
};

type CategoryRequest = {
  categoryID: string;
  subCategoryID: string;
  requestList: GradeRequest[];
};

type TransactionParty = {
  roleName: string;
  name: string;
  id: string;
};

type Order = {
  orderId: string;
  requestList: CategoryRequest[];
  transactionParties?: {
    customer: TransactionParty;
    transport: TransactionParty;
    collector: TransactionParty;
  };
  orderFinishedDate: string; // YYYY-MM-DD
  orderFinishedTime: string; // HH:mm
};

const PAGE_SIZE = 10;

const defaultFilters: OrderFiltersValue = {
  dateFrom: "",
  dateTo: "",
  categoryId: "",
  subCategoryId: "",
  orderId: "",
  orderIdMatchMode: "contains",
  priceMin: "",
  priceMax: "",
  grade: "ALL",
};

export default function Orders() {
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState<OrderFiltersValue>(defaultFilters);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await apiClient.get<{
          buyTransaction: Order[];
          sellTransaction: Order[];
        }>("/Stock/query-transaction-demo");

        setOrders(res.data.buyTransaction ?? []);
      } catch (error) {
        console.error("Failed to fetch orders", error);
        setOrders([]);
      }
    };

    void fetchOrders();
  }, []);

  const categories = useMemo(() => {
    const ids = new Set<string>();
    orders.forEach((order) => {
      order.requestList.forEach((cat) => ids.add(cat.categoryID));
    });
    return Array.from(ids).sort();
  }, [orders]);

  const subCategories = useMemo(() => {
    const ids = new Set<string>();
    orders.forEach((order) => {
      order.requestList.forEach((cat) => {
        if (!filters.categoryId || cat.categoryID === filters.categoryId) {
          ids.add(cat.subCategoryID);
        }
      });
    });
    return Array.from(ids).sort();
  }, [filters.categoryId, orders]);

  const { filteredOrders, totalMatchingItems } = useMemo(() => {
    const minPrice = filters.priceMin ? Number(filters.priceMin) : null;
    const maxPrice = filters.priceMax ? Number(filters.priceMax) : null;

    let itemsCount = 0;

    const result = orders.filter((order) => {
      if (filters.dateFrom && order.orderFinishedDate < filters.dateFrom)
        return false;
      if (filters.dateTo && order.orderFinishedDate > filters.dateTo)
        return false;

      if (filters.orderId) {
        const target = order.orderId;
        if (filters.orderIdMatchMode === "exact") {
          if (target !== filters.orderId) return false;
        } else {
          if (!target.includes(filters.orderId)) return false;
        }
      }

      let hasCategoryMatch = true;
      if (filters.categoryId) {
        hasCategoryMatch = order.requestList.some(
          (c) => c.categoryID === filters.categoryId,
        );
      }
      if (!hasCategoryMatch) return false;

      if (filters.subCategoryId) {
        const hasSub = order.requestList.some(
          (c) => c.subCategoryID === filters.subCategoryId,
        );
        if (!hasSub) return false;
      }

      let hasItemMatch = false;

      order.requestList.forEach((cat) => {
        cat.requestList.forEach((item) => {
          if (filters.grade !== "ALL" && item.grade !== filters.grade) {
            return;
          }

          if (minPrice !== null && item.price < minPrice) {
            return;
          }
          if (maxPrice !== null && item.price > maxPrice) {
            return;
          }

          if (item.total > 0 || item.quantity !== "0") {
            hasItemMatch = true;
            itemsCount += 1;
          }
        });
      });

      if (filters.grade !== "ALL" && !hasItemMatch) {
        return false;
      }

      return true;
    });

    return { filteredOrders: result, totalMatchingItems: itemsCount };
  }, [filters, orders]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);

  const getDisplayTotalForOrder = (order: Order) => {
    let sum = 0;
    order.requestList.forEach((cat) => {
      cat.requestList.forEach((item) => {
        if (filters.grade !== "ALL" && item.grade !== filters.grade) return;
        sum += item.total;
      });
    });
    return sum;
  };

  const handleApplyFilters = async () => {
    const payload = {
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
      categoryId: filters.categoryId || null,
      subCategoryId: filters.subCategoryId || null,
      orderId: filters.orderId || null,
      orderIdMatchMode: filters.orderIdMatchMode,
      priceMin: filters.priceMin ? Number(filters.priceMin) : null,
      priceMax: filters.priceMax ? Number(filters.priceMax) : null,
      grade: filters.grade === "ALL" ? null : filters.grade,
    };

    const res = await apiClient.get("/Stock/query-transaction-demo", {
      params: payload,
    });
    setOrders(res.data.buyTransaction ?? []);

    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <div className="text-xs text-gray-500">
          ผลลัพธ์ทั้งหมด: {filteredOrders.length} ออเดอร์
          {filters.grade !== "ALL" && (
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
        subCategories={subCategories}
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
                ผู้ขาย
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                รวมยอด (ตามเกรด)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pageItems.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  ไม่พบรายการตามตัวกรอง
                </td>
              </tr>
            ) : (
              pageItems.map((order) => {
                const total = getDisplayTotalForOrder(order);
                const categoriesLabel = order.requestList
                  .map((c) => `${c.categoryID}/${c.subCategoryID}`)
                  .join(", ");

                return (
                  <tr key={order.orderId}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {order.orderId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {order.orderFinishedDate} {order.orderFinishedTime}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {categoriesLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {order.transactionParties?.customer.name ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                      ฿
                      {total.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={startIndex}
          pageItemsCount={pageItems.length}
          totalItems={filteredOrders.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
