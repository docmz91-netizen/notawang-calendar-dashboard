import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import Dashboard from "../../components/dashboard" // Use relative path instead of @/components
import Calendar from "@/components/calendar"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 bg-slate-50">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">NotaWang Dashboard</h1>
          </div>
        </header>
        <div className="flex-1 p-4 space-y-6 p-6">
          <Dashboard />
          <Calendar />
        </div>
      </main>
    </SidebarProvider>
  )
}