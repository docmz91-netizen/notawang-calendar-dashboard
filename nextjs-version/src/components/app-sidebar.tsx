"use client"

import { useState } from "react"
import {
  Home,
  Inbox,
  Search,
  Menu,
} from "lucide-react"

// This is a placeholder for your actual sidebar component import.
// In a real project, you would import this from your UI library.
const Sidebar = ({ isCollapsed, className, children }) => <div data-collapsed={isCollapsed} className={`group flex flex-col border-r border-gray-200 dark:border-gray-800 h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'} ${className}`}>{children}</div>;
const SidebarHeader = ({ children }) => <div className="p-2">{children}</div>;
const SidebarContent = ({ children }) => <div className="flex-1 overflow-y-auto">{children}</div>;
const SidebarGroup = ({ children }) => <div className="px-2 py-4">{children}</div>;
const SidebarGroupLabel = ({ children }) => <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider group-data-[collapsed=true]:hidden">{children}</div>;
const SidebarGroupContent = ({ children }) => <div className="mt-2">{children}</div>;
const SidebarMenu = ({ children }) => <ul className="space-y-1">{children}</ul>;
const SidebarMenuItem = ({ children }) => <li>{children}</li>;
const SidebarMenuButton = ({ asChild, children }) => {
    // This is a simplified placeholder. When `asChild` is true, it renders the child
    // component directly, which is a common pattern in libraries like shadcn/ui.
    if (asChild) {
        return <>{children}</>;
    }
    return <button className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0">{children}</button>;
};


// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "#",
    icon: Home,
  },
  {
    title: "Contacts",
    url: "#",
    icon: Search,
  },
  {
    title: "Projects",
    url: "#",
    icon: Inbox,
  },
]

export function AppSidebar({ onPageChange }) {
  const [activePage, setActivePage] = useState("Dashboard")
  const [isCollapsed, setIsCollapsed] = useState(true) 

  const handlePageChange = (pageTitle) => {
    setActivePage(pageTitle)
    onPageChange?.(pageTitle)
  }

  return (
    <Sidebar isCollapsed={isCollapsed} className="bg-white">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white group-data-[collapsed=true]:mx-auto">
            <span className="text-sm font-bold">NW</span>
            </div>
            <span className="font-semibold group-data-[collapsed=true]:hidden">NotaWang</span>
            {/* ADD THIS TOGGLE BUTTON */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="ml-auto p-1 rounded-md hover:bg-gray-200 transition-colors group-data-[collapsed=true]:mx-auto group-data-[collapsed=true]:ml-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => handlePageChange(item.title)}
                      className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0 ${activePage === item.title ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="group-data-[collapsed=true]:hidden">{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}