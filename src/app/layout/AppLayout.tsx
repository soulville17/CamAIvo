import { Outlet } from "react-router-dom";
import { Header } from "@/app/layout/Header";
import { Sidebar } from "@/app/layout/Sidebar";
import { HelpBubble } from "@/app/layout/HelpBubble";

/** Layout du dashboard : sidebar + header + zone de contenu + bulle d'aide. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
      <HelpBubble />
    </div>
  );
}
