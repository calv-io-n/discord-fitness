import { Outlet } from "react-router";
import Sidebar from "@/components/Sidebar";

export default function App() {
  return (
    <div className="flex min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
