"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { supabase, USER_ID } from '../lib/supabase'

interface DashboardData {
  currentBalance: number
  totalPayable: number
  monthlyGoal: number
  monthlyProgress: number
  quotationTotal: number
  cashIn: number
  cashOut: number
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    currentBalance: 0,
    totalPayable: 0,
    monthlyGoal: 0,
    monthlyProgress: 0,
    quotationTotal: 0,
    cashIn: 0,
    cashOut: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // The main function to load all dashboard data is called here.
    loadDashboardData()
  }, [])

  /**
   * Fetches all necessary data for the dashboard from the Supabase backend,
   * calculates derived values, and updates the component's state.
   * Includes enhanced debugging logs and RLS tests.
   */
  const loadDashboardData = async () => {
    try {
      console.log('🔍 DEBUG: Starting dashboard data fetch...')
      console.log('🔍 DEBUG: Using USER_ID:', USER_ID)

      // 1. Test basic database connection first
      const { error: testError } = await supabase
        .from('transactions')
        .select('id') // Selecting a single, small column is efficient
        .limit(1)

      if (testError) {
        console.error('❌ Database connection failed:', testError)
        // Stop execution if we can't even connect
        return
      }
      console.log('✅ Database connection successful')

      // NEW: Test if we can read ANY data from transactions table
      const { data: allTransactions, error: allError } = await supabase
        .from('transactions')
        .select('*')
        .limit(5)

      console.log('🔍 All transactions test:', {
        count: allTransactions?.length || 0,
        error: allError,
        sampleData: allTransactions?.[0]
      })


      // 2. Get current month's transactions with improved date logic
      // FIXED: Better date range logic
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const nextMonthString = nextMonth.toISOString().slice(0, 7)

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', USER_ID) // ✅ Uncommented this line
        .gte('date', `${currentMonth}-01`)
        .lt('date', `${nextMonthString}-01`) // Use next month's first day as exclusive end

      if (transError) {
        console.error('❌ Transactions error details:', {
          message: transError.message,
          code: transError.code,
          details: transError.details,
          hint: transError.hint,
          fullError: transError
        })
        throw transError
      } else {
        console.log('✅ Transactions loaded for this month:', transactions?.length || 0, 'records')
      }

      // 3. Calculate balances from the fetched transactions
      let currentBalance = 0
      let cashIn = 0
      let cashOut = 0

      transactions?.forEach(transaction => {
        if (transaction.type === 'income') {
          currentBalance += transaction.amount
          cashIn += transaction.amount
        } else if (transaction.type === 'expense') {
          currentBalance -= transaction.amount
          cashOut += transaction.amount
        }
      })
      console.log('📊 Calculated Cash-In:', cashIn, 'Cash-Out:', cashOut)


      // 4. Get monthly goal
      const { data: goalData, error: goalError } = await supabase
        .from('monthly_goals')
        .select('goal_amount')
        .eq('user_id', USER_ID)
        .eq('month', currentMonth)
        .single()

      // PGRST116 is the code for "No rows found", which is not a critical error here.
      if (goalError && goalError.code !== 'PGRST116') {
        console.error('❌ Monthly goal error:', goalError)
        throw goalError
      } else {
        console.log('✅ Monthly goal loaded:', goalData?.goal_amount || 0)
      }

      // 5. Calculate progress and set final state
      const monthlyGoal = goalData?.goal_amount || 0
      const monthlyProgress = monthlyGoal > 0 ? (cashIn / monthlyGoal) * 100 : 0

      setData({
        currentBalance,
        totalPayable: 0, // Placeholder, to be calculated from projects
        monthlyGoal,
        monthlyProgress,
        quotationTotal: 0, // Placeholder, to be calculated from projects
        cashIn,
        cashOut
      })
      console.log('✅ Dashboard data processed and set.')

    } catch (error: any) {
      console.error('Error loading dashboard data:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        fullError: error
      })
    } finally {
      // This will run regardless of success or failure
      setLoading(false)
      console.log('🏁 Fetch operation finished.')
    }
  }

  /**
   * Formats a number into a currency string (MYR).
   * @param {number} amount The number to format.
   * @returns {string} The formatted currency string.
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount)
  }

  // Display a loading state while data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  // Main component render
  return (
    <div className="space-y-6">
      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-sm font-medium text-gray-500">Total Payable (Overall)</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-semibold">{formatCurrency(data.totalPayable)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
              Monthly Goal
              <button className="text-gray-400 hover:text-indigo-600" aria-label="Edit monthly goal">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(data.monthlyProgress, 100)} className="mb-2" />
            <div className="flex justify-between items-baseline text-sm">
              <span className="font-semibold">{Math.min(data.monthlyProgress, 100).toFixed(0)}%</span>
              <span className="text-gray-500">of {formatCurrency(data.monthlyGoal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-sm font-medium text-gray-500">Current Account Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-semibold">{formatCurrency(data.currentBalance)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}