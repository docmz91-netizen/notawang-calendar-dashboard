import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold">
            NW
          </div>
          <span className="font-semibold text-lg">NotaWang</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800">
            📊 Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800">
            👥 Contacts
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-slate-800">
            📋 Projects
          </Button>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center font-bold text-sm">
            U
          </div>
          <div>
            <div className="text-sm font-medium">Business User</div>
            <div className="text-xs text-slate-400">Administrator</div>
          </div>
        </div>
      </div>
    </div>
  )
}