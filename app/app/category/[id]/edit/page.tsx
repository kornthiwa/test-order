"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/apiClient";

type Category = { _id?: string; categoryId: string; categoryName: string };

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    const fetchOne = async () => {
      try {
        const res = await apiClient.get<Category>(`/category/${id}`);
        if (!active) return;
        setCategoryId(res.data.categoryId ?? "");
        setCategoryName(res.data.categoryName ?? "");
      } catch {
        if (active) setError("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchOne();
    return () => {
      active = false;
    };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      await apiClient.patch(`/category/${id}`, {
        categoryId: categoryId.trim(),
        categoryName: categoryName.trim(),
      });
      router.push("/category");
    } catch (err: unknown) {
      setError(err && typeof err === "object" && "message" in err ? String((err as Error).message) : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-6">
        <p className="text-sm text-gray-600">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">แก้ไขหมวดหมู่</h1>
        <Link href="/category" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ย้อนกลับ
        </Link>
      </div>
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500">Category ID *</label>
            <input
              type="text"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">ชื่อหมวดหมู่ *</label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
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
          <Link href="/category" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
