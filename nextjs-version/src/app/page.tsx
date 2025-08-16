"use client"

import { useState, createContext, useContext } from "react"
import { Home, Users, FolderKanban } from "lucide-react"

// --- Mock UI Components ---
// In a real application, these would be in separate files.
// The context has been updated to provide a `toggle` function as requested.

const SidebarContext = createContext<{
  isOpen: boolean
  toggle: () => void
}>({
  isOpen: true,
  toggle: () => {},
})

const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true)
  const toggle = () => setIsOpen((prev) => !prev)

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

const useSidebar = () => useContext(SidebarContext)

const SidebarTrigger = ({ className }: { className?: string }) => {
  const { toggle } = useSidebar()
  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-md hover:bg-gray-200 ${className}`}
      aria-label="Toggle sidebar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  )
}

const SidebarInset = ({ children }: { children: React.ReactNode }) => {
  const { isOpen } = useSidebar()
  return (
    <main
      className={`flex-1 transition-all duration-300 ${
        isOpen ? "ml-64" : "ml-16"
      }`}
    >
      {children}
    </main>
  )
}

// --- Mock AppSidebar Component ---
const AppSidebar = ({
  onPageChange,
}: {
  onPageChange: (page: string) => void
}) => {
  const { isOpen } = useSidebar() // Using context to get the sidebar state
  // State to track the active page for styling
  const [activePage, setActivePage] = useState("Dashboard")

  const navItems = [
    { name: "Dashboard", icon: <Home size={20} /> },
    { name: "Contacts", icon: <Users size={20} /> },
    { name: "Projects", icon: <FolderKanban size={20} /> },
  ]

  // Handles click events on navigation items
  const handlePageClick = (pageName: string) => {
    setActivePage(pageName)
    onPageChange(pageName)
  }

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen border-r bg-background transition-all duration-300 ease-in-out ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <div className="flex h-16 shrink-0 items-center gap-2 self-stretch border-b px-4">
          <span className={`font-semibold text-lg ${!isOpen && "hidden"}`}>
            NotaWang
          </span>
        </div>
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handlePageClick(item.name)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full ${
              activePage === item.name
                ? "bg-muted text-primary"
                : "text-muted-foreground hover:text-primary"
            } ${!isOpen ? "justify-center" : ""}`}
          >
            {item.icon}
            {isOpen && <span className="truncate">{item.name}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}

// --- Page Components ---
const Dashboard = () => (
  <>
    {/* === ALIGNED 3-CARD LAYOUT === */}
    <div className="overall-balances-section grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-4">
      {/* Total Payable Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
        <h2 className="text-sm font-medium text-gray-500">
          Total Payable (Overall)
        </h2>
        <div className="text-2xl font-semibold text-gray-800 mt-2">
          <span>RM0.00</span>
        </div>
      </div>

      {/* Monthly Goal Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 relative">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-medium text-gray-500">Monthly Goal</h2>
        </div>
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2 w-full">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{ width: "0%" }}
            ></div>
          </div>
          <div className="flex justify-between items-baseline mt-2">
            <p className="text-base font-semibold text-gray-800">0%</p>
            <p className="text-xs font-medium text-gray-500">of RM 0.00</p>
          </div>
        </div>
      </div>

      {/* Current Account Balance Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
        <h2 className="text-sm font-medium text-gray-500">
          Current Account Balance
        </h2>
        <div className="text-2xl font-semibold text-gray-800 mt-2">
          <span>RM820.00</span>
        </div>
      </div>
    </div>

    {/* Monthly Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Total Quotation (This Month)
        </h3>
        <span className="text-2xl font-bold text-gray-900">RM0.00</span>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Total Invoice (This Month)
        </h3>
        <span className="text-2xl font-bold text-gray-900">RM0.00</span>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Cash-In (This Month)
        </h3>
        <span className="text-2xl font-bold text-green-600">RM1,000.00</span>
      </div>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Cash-Out (This Month)
        </h3>
        <span className="text-2xl font-bold text-red-600">RM180.00</span>
      </div>
    </div>

    {/* Calendar placeholder */}
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">August 2025</h2>
      </div>
      <div className="text-center py-8 text-gray-500">
        Calendar component will be added here
      </div>
    </div>
  </>
)

const ContactsPage = () => (
  <div className="p-6 rounded-xl bg-muted/50 min-h-screen">
    <h2 className="text-2xl font-bold">Contacts Page</h2>
    <p className="mt-2 text-muted-foreground">Manage your contacts here.</p>
  </div>
)

const ProjectsPage = () => (
  <div className="p-6 rounded-xl bg-muted/50 min-h-screen">
    <h2 className="text-2xl font-bold">Projects Page</h2>
    <p className="mt-2 text-muted-foreground">Track your projects here.</p>
  </div>
)

// --- Main Page Component ---
export default function Page() {
  const [currentPage, setCurrentPage] = useState("Dashboard")

  const renderPage = () => {
    switch (currentPage) {
      case "Contacts":
        return <ContactsPage />
      case "Projects":
        return <ProjectsPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar onPageChange={setCurrentPage} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="mx-auto">
            <h1 className="text-lg font-semibold">{currentPage}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{renderPage()}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}