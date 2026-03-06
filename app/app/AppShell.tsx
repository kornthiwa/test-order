"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const HIDE_NAV_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !HIDE_NAV_PATHS.includes(pathname);

  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-900/5 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl inline-flex items-center justify-center bg-[linear-gradient(135deg,var(--color-primary),var(--color-secondary))] text-white font-bold text-[0.9rem]">
            OM
          </span>
          <span className="text-[1.1rem] font-semibold">Order Management</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: "32px",
            fontSize: "16px",
            color: "var(--color-primary)",
          }}
          className="flex items-center gap-5 text-sm"
        >
          <Link
            href="/orders"
            className="relative bg-transparent border-none py-1 cursor-pointer text-inherit font-inherit focus:outline-none hover:text-[color:var(--color-primary)] after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:rounded-full after:bg-[color:var(--color-primary)] after:transition-[width] after:duration-150 hover:after:w-full"
          >
            Orders
          </Link>
          <Link
            href="/orders/summary"
            className="relative bg-transparent border-none py-1 cursor-pointer text-inherit font-inherit focus:outline-none hover:text-[color:var(--color-primary)] after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:rounded-full after:bg-[color:var(--color-primary)] after:transition-[width] after:duration-150 hover:after:w-full"
          >
            Summary
          </Link>
          <Link
            href="/category"
            className="relative bg-transparent border-none py-1 cursor-pointer text-inherit font-inherit focus:outline-none hover:text-[color:var(--color-primary)] after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:rounded-full after:bg-[color:var(--color-primary)] after:transition-[width] after:duration-150 hover:after:w-full"
          >
            Category
          </Link>
          <Link
            href="/sub-category"
            className="relative bg-transparent border-none py-1 cursor-pointer text-inherit font-inherit focus:outline-none hover:text-[color:var(--color-primary)] after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:rounded-full after:bg-[color:var(--color-primary)] after:transition-[width] after:duration-150 hover:after:w-full"
          >
            Sub Category
          </Link>
        </div>
      </nav>
      <main className="flex-1 px-8 pt-6 pb-10  w-full mx-auto">{children}</main>
    </div>
  );
}
