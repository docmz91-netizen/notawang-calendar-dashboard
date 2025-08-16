"use client"

import { useState, useEffect, useCallback } from 'react'

// --- Placeholder Components for Demonstration ---
const Card = ({ children, className }) => <div className={`border rounded-lg shadow-sm ${className}`}>{children}</div>;
const CardHeader = ({ children }) => <div className="p-6">{children}</div>;
const CardTitle = ({ children, className }) => <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;
const CardContent = ({ children, className }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;
const Button = ({ children, variant, size, onClick, className, disabled }) => (
    <button onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${variant === 'outline' ? 'border border-input hover:bg-accent hover:text-accent-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'} ${size === 'icon' ? 'h-10 w-10' : 'h-10 py-2 px-4'} ${className}`}>
        {children}
    </button>
);
const ChevronLeft = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6" /></svg>;
const ChevronRight = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6" /></svg>;
const X = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const Trash2 = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
// --- End of Placeholder Components ---

// --- Slide-in TransactionModal ---
const TransactionModal = ({ isOpen, onClose, selectedDate, transactions, onSave, onEdit, onDelete, projects, onToggleTask }) => {
    const [newTransaction, setNewTransaction] = useState({
        type: '',
        title: '',
        amount: '',
        description: '',
        project_id: '',
    })
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR'
        }).format(amount)
    }

    const handleSave = () => {
        // Tasks don't need amount, others do
        const isValid = newTransaction.type && newTransaction.title &&
            (newTransaction.type === 'task' || newTransaction.amount);

        if (isValid) {
            const transactionData = {
                type: newTransaction.type,
                title: newTransaction.title,
                amount: newTransaction.type === 'task' ? 0 : parseFloat(newTransaction.amount),
                description: newTransaction.description,
                project_id: newTransaction.project_id || null,
            };

            if (isEditMode) {
                onSave({ ...editingTransaction, ...transactionData });
            } else {
                onSave({ ...transactionData, date: selectedDate });
            }

            resetState();
        }
    }

    const resetState = () => {
        setIsEditMode(false);
        setEditingTransaction(null);
        setNewTransaction({ type: '', title: '', amount: '', description: '', project_id: '' });
    };

    const handleEditTransaction = (transaction) => {
        setIsEditMode(true);
        setEditingTransaction(transaction);
        setNewTransaction({
            type: transaction.type,
            title: transaction.title,
            amount: transaction.amount.toString(),
            description: transaction.description || '',
            project_id: transaction.project_id || '',
        });
        // Scroll to top of modal to show the editing form
        const modalContent = document.querySelector('.overflow-y-auto');
        if (modalContent) {
            modalContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className={`fixed inset-0 z-50 transition-all duration-300 ${
            isOpen ? 'bg-black/50' : 'bg-transparent pointer-events-none'
        }`}>
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white transform transition-transform duration-300 ease-out overflow-y-auto ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">
                            Daily Overview • {new Date(selectedDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
                            ✕
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">
                                {isEditMode ? 'Edit Entry' : 'Add New Entry'}
                            </h4>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Type</label>
                                <select
                                    value={newTransaction.type}
                                    onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value }))}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                >
                                    <option value="">Select type</option>
                                    <option value="income">Income</option>
                                    <option value="expense">Expense</option>
                                    <option value="task">Task</option>
                                </select>
                            </div>
                            
                            {newTransaction.type === 'task' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Project</label>
                                    <select
                                        value={newTransaction.project_id}
                                        onChange={(e) => setNewTransaction(prev => ({ ...prev, project_id: e.target.value }))}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                    >
                                        <option value="">Select project</option>
                                        {projects.map(project => (
                                            <option key={project.id} value={project.id}>{project.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Title</label>
                                <input
                                    type="text"
                                    value={newTransaction.title}
                                    onChange={(e) => setNewTransaction(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Transaction description"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                />
                            </div>
                            
                            {newTransaction.type !== 'task' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Amount (RM)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newTransaction.amount}
                                        onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Description (Optional)</label>
                                <textarea
                                    value={newTransaction.description || ''}
                                    onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Add notes or details..."
                                    rows={3}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium">
                                    {isEditMode ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </div>
                        {/* EXISTING TRANSACTIONS SECTION */}
                        {transactions.length > 0 && (
                            <div className="space-y-4 border-t pt-6">
                                <h4 className="font-medium text-gray-900">Today's Entries</h4>

                                {['income', 'expense', 'task'].map(type => {
                                    const typeTransactions = transactions.filter(t => t.type === type);
                                    if (typeTransactions.length === 0) return null;

                                    return (
                                        <div key={type} className="space-y-2">
                                            <div className="flex items-center space-x-2 mb-3">
                                                <h5 className="text-sm font-medium text-gray-700 capitalize">
                                                    {type}
                                                </h5>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    type === 'income'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : type === 'expense'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {typeTransactions.length}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {typeTransactions.map((transaction, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`group flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-all duration-200 cursor-pointer ${
                                                            transaction.type === 'task' && transaction.is_completed
                                                                ? 'bg-gray-100 border-gray-200 opacity-75'  // Greyish when completed
                                                                : 'bg-white border-gray-100 hover:border-gray-200'  // Normal when not completed
                                                        }`}
                                                        onClick={() => {
                                                            // Only trigger edit for non-tasks or if not clicking checkbox
                                                            if (transaction.type !== 'task') {
                                                                handleEditTransaction(transaction);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            {transaction.type === 'task' && (
                                                                <div className="relative">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={transaction.is_completed || false}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            onToggleTask(transaction.id, e.target.checked);
                                                                        }}
                                                                        className="sr-only"
                                                                        id={`task-${transaction.id}`}
                                                                    />
                                                                    <label 
                                                                        htmlFor={`task-${transaction.id}`}
                                                                        className={`flex items-center justify-center w-5 h-5 border-2 rounded-md cursor-pointer transition-all duration-200 ${
                                                                            transaction.is_completed 
                                                                                ? 'bg-blue-500 border-blue-500 text-white' 
                                                                                : 'border-gray-300 hover:border-blue-400 bg-white'
                                                                        }`}
                                                                    >
                                                                        {transaction.is_completed && (
                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
                                                                    </label>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-gray-900 text-sm">
                                                                    {transaction.title}
                                                                </div>
                                                                {/* NEW: Project name as subheading for tasks */}
                                                                {transaction.type === 'task' && (
                                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                                        {projects.find(p => p.id === transaction.project_id)?.name || 'No Project'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center space-x-3">
                                                            <div className={`font-semibold text-sm ${
                                                                transaction.type === 'income' 
                                                                    ? 'text-emerald-600' 
                                                                    : transaction.type === 'expense'
                                                                    ? 'text-red-600'
                                                                    : 'text-blue-600'
                                                            }`}>
                                                                {transaction.type === 'task' 
                                                                    ? 'Client Name' // Replace with actual client field
                                                                    : formatCurrency(transaction.amount)
                                                                }
                                                            </div>
                                                            {/* Delete button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDelete(transaction.id);
                                                                }}
                                                                className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                                                                title="Delete transaction"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
};


export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date(2025, 7, 1))
    const [transactions, setTransactions] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedDay, setSelectedDay] = useState(null)

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR'
        }).format(amount)
    }

    const handleDayClick = (day) => {
        if (!day.isCurrentMonth) return;
        setSelectedDay(day)
        setTimeout(() => setIsModalOpen(true), 10) // Small delay for smooth transition
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        setTimeout(() => setSelectedDay(null), 300) // Wait for animation to complete
    }

    const [monthlyData, setMonthlyData] = useState({
        cashIn: 0,
        cashOut: 0,
        quotation: 0,
        invoice: 0
    })

    const loadTransactions = useCallback(async () => {
        try {
            console.log('🔍 Fetching data for:', currentDate.getFullYear(), currentDate.getMonth() + 1)
            
            // This is a placeholder for your actual Supabase client setup
            const { supabase } = await import('@/lib/supabase')

            const currentYear = currentDate.getFullYear()
            const currentMonth = currentDate.getMonth() + 1
            const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

            console.log('🔍 Looking for transactions in month:', monthStr)

            // Calculate next month properly
            const nextMonthDate = new Date(currentDate);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            const nextYear = nextMonthDate.getFullYear();
            const nextMonth = nextMonthDate.getMonth() + 1;

            const { data: transactionsData, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', 'ed83d1fa-43a0-46c5-b6d1-98e92efbdd3f')
                .gte('date', `${monthStr}-01`)
                .lt('date', `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`)

            if (error) throw error;

            console.log('🔍 Found transactions:', transactionsData)
            setTransactions(transactionsData || []);

            let cashIn = 0, cashOut = 0
            transactionsData?.forEach(t => {
                if (t.type === 'income') cashIn += t.amount
                if (t.type === 'expense') cashOut += t.amount
            })

            console.log('🔍 Calculated amounts - Cash In:', cashIn, 'Cash Out:', cashOut)
            setMonthlyData({ cashIn, cashOut, quotation: 0, invoice: 0 })

            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('id, name')
                .eq('user_id', 'ed83d1fa-43a0-46c5-b6d1-98e92efbdd3f');
            if (!projectsError) {
                setProjects(projectsData || []);
            }

        } catch (error) {
            console.error('Error fetching data:', error)
            // In a real app, you might use a toast notification library
            // alert('Could not fetch transaction data.')
        }
    }, [currentDate]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions])


    const handleTransactionSave = async (transactionData) => {
        try {
            const { supabase } = await import('@/lib/supabase')
            let error;
            // Remove 'project' field and only keep database-compatible fields
            const dbData = {
                type: transactionData.type,
                title: transactionData.title,
                amount: transactionData.amount,
                description: transactionData.description,
                date: transactionData.date,
                project_id: transactionData.project_id
            };
            if (transactionData.id) {
                // Update existing transaction
                console.log('💾 Updating transaction with ID:', transactionData.id)
                console.log('💾 Update data:', dbData)
                const { data, error: updateError } = await supabase
                    .from('transactions')
                    .update(dbData)
                    .eq('id', transactionData.id)
                    .eq('user_id', 'ed83d1fa-43a0-46c5-b6d1-98e92efbdd3f')
                    .select(); // Add .select() to return the updated row
                console.log('💾 Update result:', data)
                console.log('💾 Update error:', updateError)
                if (updateError) {
                    console.log('💾 Error details:', JSON.stringify(updateError, null, 2))
                    console.log('💾 Error message:', updateError.message)
                    console.log('💾 Error code:', updateError.code)
                }
                error = updateError;
            } else {
                // Insert new transaction
                console.log('💾 Saving new transaction:', dbData)
                const { error: insertError } = await supabase
                    .from('transactions')
                    .insert([{
                        ...dbData,
                        user_id: 'ed83d1fa-43a0-46c5-b6d1-98e92efbdd3f'
                    }]);
                error = insertError;
            }
            if (error) throw error;
            
            // IMMEDIATELY UPDATE THE SELECTED DAY'S TRANSACTIONS
            if (transactionData.id) {
                // Update existing transaction in selectedDay
                const updatedTransactions = selectedDay.transactions.map(t => 
                    t.id === transactionData.id ? { ...t, ...dbData } : t
                );
                setSelectedDay(prev => ({ ...prev, transactions: updatedTransactions }));
            } else {
                // Add new transaction to selectedDay
                const newTransaction = { ...dbData, id: Date.now().toString() }; // Temporary ID
                setSelectedDay(prev => ({ ...prev, transactions: [...prev.transactions, newTransaction] }));
            }

            await loadTransactions() // Reload the data
            // Do not close the modal, just refresh data. The form inside the modal will reset.
        } catch (error) {
            console.error('Error saving transaction:', error)
            // alert(`Error saving transaction: ${error.message}`)
        }
    }


    const handleTransactionEdit = async (transaction) => {
        console.log('🔧 Editing transaction:', transaction)
        // This is now handled inside the modal by clicking the 'Edit' button
    }

    const handleTransactionDelete = async (transactionId) => {
        console.log('🗑️ Deleting transaction:', transactionId)
        
        // Using a custom modal for confirmation would be better than window.confirm
        // For this example, we'll keep it simple.
        if (!window.confirm('Are you sure you want to delete this transaction?')) {
            return
        }

        try {
            const { supabase } = await import('@/lib/supabase')

            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transactionId)
                .eq('user_id', 'ed83d1fa-43a0-46c5-b6d1-98e92efbdd3f')

            if (error) throw error;

            console.log('✅ Transaction deleted successfully')
            
            // IMMEDIATELY UPDATE THE SELECTED DAY'S TRANSACTIONS
            const updatedTransactions = selectedDay.transactions.filter(t => t.id !== transactionId);
            setSelectedDay(prev => ({ ...prev, transactions: updatedTransactions }));
            
            await loadTransactions(); // Refresh data
            // The modal will stay open, showing the updated list of transactions.
        } catch (error) {
            console.error('❌ Error deleting transaction:', error)
            // alert(`Failed to delete transaction: ${error.message}`)
        }
    }

    const handleTaskToggle = async (transactionId, isCompleted) => {
        console.log('🔄 Toggling task:', transactionId, 'completed:', isCompleted);
        
        try {
            const { supabase } = await import('@/lib/supabase');
            
            const { error } = await supabase
                .from('transactions')
                .update({ is_completed: isCompleted })
                .eq('id', transactionId)
                .eq('user_id', 'ed83d1fa-43a0-46c5-b6d1-98e92efbdd3f');
                
            if (error) throw error;
            
            // Update selectedDay immediately
            const updatedTransactions = selectedDay.transactions.map(t => 
                t.id === transactionId ? { ...t, is_completed: isCompleted } : t
            );
            setSelectedDay(prev => ({ ...prev, transactions: updatedTransactions }));
            
            await loadTransactions(); // Background refresh
            
        } catch (error) {
            console.error('❌ Error toggling task:', error);
        }
    };

    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarDays = [];

        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push({
                date: daysInPrevMonth - firstDayOfMonth + 1 + i,
                isCurrentMonth: false,
                transactions: [],
            });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTransactions = transactions.filter(t => t.date === dateStr);

            calendarDays.push({
                date: day,
                isCurrentMonth: true,
                transactions: dayTransactions,
            });
        }

        let nextMonthDay = 1;
        while (calendarDays.length < 42) {
            calendarDays.push({
                date: nextMonthDay++,
                isCurrentMonth: false,
                transactions: [],
            });
        }

        return calendarDays;
    };

    return (
        <div className="w-full">
            <Card className="bg-white">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <CardTitle className="text-xl md:text-2xl">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 !pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-gray-100/50">
                            <CardHeader><CardTitle className="text-sm font-medium text-gray-500">Total Quotation (This Month)</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{formatCurrency(monthlyData.quotation)}</div></CardContent>
                        </Card>
                        <Card className="bg-gray-100/50">
                            <CardHeader><CardTitle className="text-sm font-medium text-gray-500">Total Invoice (This Month)</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{formatCurrency(monthlyData.invoice)}</div></CardContent>
                        </Card>
                        <Card className="bg-gray-100/50">
                            <CardHeader><CardTitle className="text-sm font-medium text-gray-500">Cash-In (This Month)</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(monthlyData.cashIn)}</div></CardContent>
                        </Card>
                        <Card className="bg-gray-100/50">
                            <CardHeader><CardTitle className="text-sm font-medium text-gray-500">Cash-Out (This Month)</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(monthlyData.cashOut)}</div></CardContent>
                        </Card>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-7 bg-gray-50">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 min-h-64">
                            {generateCalendarDays().map((day, i) => (
                                <div
                                    key={i}
                                    className={`border-r border-b border-gray-200 last:border-r-0 p-2 min-h-20 hover:bg-gray-50 cursor-pointer ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}`}
                                    onClick={() => handleDayClick(day)}
                                >
                                    <div className={`text-sm ${day.isCurrentMonth ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                        {day.date}
                                    </div>
                                    {day.transactions.length > 0 && (
                                        <div className="mt-1 space-y-1">
                                            {day.transactions.slice(0, 2).map((transaction, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`text-xs px-1 py-0.5 rounded text-white truncate ${
                                                        transaction.type === 'income' 
                                                            ? 'bg-green-500' 
                                                            : transaction.type === 'expense'
                                                            ? 'bg-red-500'
                                                            : 'bg-blue-500'
                                                    }`}
                                                >
                                                    {transaction.type === 'task' 
                                                        ? 'Task' 
                                                        : formatCurrency(transaction.amount)
                                                    }
                                                </div>
                                            ))}
                                            {day.transactions.length > 2 && (
                                                <div className="text-xs text-gray-500">+{day.transactions.length - 2} more</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedDay && (
                <TransactionModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    selectedDate={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.date).padStart(2, '0')}`}
                    transactions={selectedDay.transactions}
                    onSave={handleTransactionSave}
                    onEdit={handleTransactionEdit}
                    onDelete={handleTransactionDelete}
                    projects={projects}
                    onToggleTask={handleTaskToggle}
                />
            )}
        </div>
    )
}