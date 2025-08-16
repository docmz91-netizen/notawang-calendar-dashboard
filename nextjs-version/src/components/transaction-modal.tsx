"use client"

import { useState, useEffect } from 'react'

export default function TransactionModal({ isOpen, onClose, selectedDate, transactions, onSave, onEdit, onDelete }) {
  const [newTransaction, setNewTransaction] = useState({
    type: '',
    title: '',
    amount: '',
    project: '', // This is kept for the form state, but not saved.
    description: '',
  })
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount)
  }

  // Updated handleSave function as per your request
  const handleSave = () => {
    const isTask = newTransaction.type === 'task';
    const isValid = newTransaction.type && newTransaction.title && (isTask || newTransaction.amount);

    if (isValid) {
      // Remove 'project' field since it doesn't exist in the database
      const transactionData = {
        type: newTransaction.type,
        title: newTransaction.title,
        amount: isTask ? 0 : parseFloat(newTransaction.amount),
        description: newTransaction.description,
      };

      if (isEditMode) {
        onSave({ ...editingTransaction, ...transactionData });
      } else {
        onSave({ ...transactionData, date: selectedDate });
      }

      resetState();
    }
  }


  const handleEdit = (transaction) => {
    setIsEditMode(true);
    setEditingTransaction(transaction);
    setNewTransaction({
      type: transaction.type,
      title: transaction.title,
      amount: (transaction.amount || 0).toString(),
      project: transaction.project || '',
      description: transaction.description || '',
    });

    if (onEdit) {
      onEdit(transaction);
    }
  };

  const handleDelete = (transaction) => {
    if (onDelete) {
      onDelete(transaction);
    }
  };

  const resetState = () => {
    setIsEditMode(false);
    setEditingTransaction(null);
    setNewTransaction({ type: '', title: '', amount: '', project: '', description: '' });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };
  
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

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
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-xl">
              ✕
            </button>
          </div>
          
          <div className="space-y-6">
            {/* FORM SECTION FIRST */}
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
  
              {/* Conditionally show Amount field (hide for tasks) */}
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

              {/* Show Project field only for tasks */}
              {newTransaction.type === 'task' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Project</label>
                  <select 
                    value={newTransaction.project || ''} 
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select project</option>
                    <option value="Website Redesign">Website Redesign</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Marketing Campaign">Marketing Campaign</option>
                  </select>
                </div>
              )}
  
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium">
                  {isEditMode ? 'Update' : 'Add'}
                </button>
                {isEditMode && (
                  <button onClick={resetState} className="px-4 py-3 border rounded-lg hover:bg-gray-50 font-semibold transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* EXISTING TRANSACTIONS SECOND */}
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
                            onClick={() => handleEdit(transaction)}
                            className="group flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
                          >
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{transaction.title}</div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              {transaction.type !== 'task' ? (
                                <div className={`font-semibold text-sm ${
                                  transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(transaction.amount)}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                  {transaction.project || 'No Project'}
                                </div>
                              )}
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(transaction);
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
}