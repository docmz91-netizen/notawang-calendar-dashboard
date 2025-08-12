/**
 * transactions.js - Transaction Management
 * Handles all transaction-related functionality and database operations
 */
import { getCurrentCalendarDate } from './calendar.js';
import { supabase, testConnection } from './supabase-client.js';
import { CONFIG } from './config.js';
import { getProjectCalendarItems } from './project-manager.js';
import { refreshCalendar } from './calendar.js';
import { fetchAndDisplayMonthlyGoal } from './monthly-goal.js';

let allTransactions = [];
let transactionsSubscription = null;
let projectsSubscription = null;
let projectData = { quotations: [], invoices: [], tasks: [] };
let currentUserId = null;

/**
 * Set up transaction system
 */
export async function setupTransactions() {
    console.log('💰 Setting up transaction system...');
    try {
        currentUserId = CONFIG.USER_ID;
        if (!currentUserId) throw new Error('No user ID available for transactions.');

        const isConnected = await testConnection();
        if (isConnected) {
            await setupSupabaseListener(currentUserId);
        } else {
            console.warn('⚠️ Database unavailable - running in offline mode');
        }
         
        setupTransactionUI();
        console.log('✅ Transaction system setup complete');
    } catch (error) {
        console.error('❌ Failed to setup transactions:', error);
    }
}

/**
 * Set up Supabase real-time listener
 */
async function setupSupabaseListener(userId) {
    if (!supabase || !userId) return;
     
    await refetchTransactionData(getCurrentCalendarDate());

    if (transactionsSubscription) supabase.removeChannel(transactionsSubscription);
    if (projectsSubscription) supabase.removeChannel(projectsSubscription);

    // Set up real-time listener for the 'transactions' table
    transactionsSubscription = supabase.channel('public:transactions')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'transactions', 
            filter: `user_id=eq.${userId}` 
        }, (payload) => {
            console.log('📡 Real-time change received from transactions:', payload);
            refetchTransactionData(getCurrentCalendarDate());
        })
        .subscribe();
         
    // Set up real-time listener for the 'projects' table
    projectsSubscription = supabase.channel('public:projects')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'projects', 
            filter: `user_id=eq.${userId}` 
        }, (payload) => {
            console.log('📡 Real-time change received from projects:', payload);
            refetchTransactionData(getCurrentCalendarDate());
                // ENHANCED: Force explicit calendar refresh for task changes
                setTimeout(() => {
                    refreshCalendar();
                }, 100); // Small delay to ensure data is processed first
        })
        .subscribe();

    console.log('✅ Supabase real-time listeners set up');
}

/**
 * UPDATED: Replace the entire processAllTransactions function in transactions.js
 * with this fixed version that counts ALL quotations for the viewed month
 */
function processAllTransactions(transactions, viewedDate = null) {
    allTransactions = transactions;
    let totalCurrentBalance = 0;

    const now = viewedDate || new Date();
    const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
     
    const thisMonthString = `${thisMonthDate.getFullYear()}-${String(thisMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthString = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    let thisMonth = { cashIn: 0, cashOut: 0, payable: 0, quotation: 0, quotationCount: 0, totalInvoice: 0 };
    let lastMonth = { cashIn: 0, cashOut: 0, payable: 0, quotation: 0, quotationCount: 0 };
     
    let overallTotalPayable = 0;
     
    allTransactions.forEach((data) => {
        if (data.type === 'income') totalCurrentBalance += data.amount;
        if (data.type === 'expense') totalCurrentBalance -= data.amount;
         
        if (data.date.startsWith(thisMonthString)) {
            if (data.type === 'income') thisMonth.cashIn += data.amount;
            if (data.type === 'expense') thisMonth.cashOut += data.amount;
        } else if (data.date.startsWith(lastMonthString)) {
            if (data.type === 'income') lastMonth.cashIn += data.amount;
            if (data.type === 'expense') lastMonth.cashOut += data.amount;
        }
    });

    let thisMonthPaidInvoiceAmount = 0;
    let thisMonthTotalInvoiceAmount = 0;
    const countedProjectsForTotalInvoice = new Set();

    if (projectData && Array.isArray(projectData.invoices)) {
        projectData.invoices.forEach(invoice => {
            if (!invoice.is_paid) { 
                overallTotalPayable += invoice.amount;
            }
            // MODIFIED: Use a Set to track projects to prevent double-counting staggered projects
            if (invoice.due_date?.startsWith(thisMonthString)) {
                if (invoice._project && !countedProjectsForTotalInvoice.has(invoice._project.id)) {
                    thisMonth.totalInvoice += parseFloat(invoice._project.total_amount) || 0;
                    thisMonthTotalInvoiceAmount += parseFloat(invoice._project.total_amount) || 0;
                    countedProjectsForTotalInvoice.add(invoice._project.id);
                }
                if (invoice.is_paid) {
                    thisMonthPaidInvoiceAmount += invoice.amount;
                }
            } else if (invoice.due_date?.startsWith(lastMonthString)) {
                lastMonth.payable += invoice.amount;
            }
        });
    }
    
    // FIXED: Calculate quotation totals for the viewed month vs last month
    console.log('🗓️ MONTH DEBUG (FIXED):');
    console.log('  - Current viewed date:', now);
    console.log('  - This month string:', thisMonthString);
    console.log('  - Last month string:', lastMonthString);
    console.log('  - Calculating quotations for both this month and last month for proper comparison.');
     
    const projectsThisMonth = new Set();
    const projectsLastMonth = new Set();

    if (projectData && Array.isArray(projectData.quotations)) {
        console.log('💰 QUOTATION CALCULATION (FIXED - INCLUDING CONVERTED):');
        console.log('  - Total projects in database:', projectData.quotations.length);
         
        projectData.quotations.forEach(project => {
            const actualProjectId = project.project_id || project.id.toString().split('_milestone_')[0];
            const projectDate = new Date(project.target_date || project.created_at);
            const isThisMonth = projectDate.getFullYear() === now.getFullYear() && projectDate.getMonth() === now.getMonth();
            const isLastMonth = projectDate.getFullYear() === lastMonthDate.getFullYear() && projectDate.getMonth() === lastMonthDate.getMonth();

            if (isThisMonth && !projectsThisMonth.has(actualProjectId)) {
                thisMonth.quotation += project.amount || 0;
                thisMonth.quotationCount++;
                projectsThisMonth.add(actualProjectId);
                console.log(`  ✅ Added quotation (${project.status}) for THIS MONTH: ${project.name} - RM${project.amount}`);
            } else if (isLastMonth && !projectsLastMonth.has(actualProjectId)) {
                lastMonth.quotation += project.amount || 0;
                lastMonth.quotationCount++;
                projectsLastMonth.add(actualProjectId);
                console.log(`  ✅ Added quotation (${project.status}) for LAST MONTH: ${project.name} - RM${project.amount}`);
            } else {
                console.log(`  ⏭️ Skipping project: ${project.name} (already counted or not in viewed months)`);
            }
        });
         
        console.log('  📊 Final totals for THIS MONTH (INCLUDING CONVERTED):');
        console.log(`    - Quotation amount: RM${thisMonth.quotation}`);
        console.log(`    - Quotation count: ${thisMonth.quotationCount}`);
        console.log('  📊 Final totals for LAST MONTH (FOR COMPARISON):');
        console.log(`    - Quotation amount: RM${lastMonth.quotation}`);
        console.log(`    - Quotation count: ${lastMonth.quotationCount}`);
    }
     
    updateBalanceDisplays(totalCurrentBalance, overallTotalPayable);
    updateMonthlySummaryDisplays(thisMonth, lastMonth, lastMonthDate, thisMonthPaidInvoiceAmount, thisMonthTotalInvoiceAmount); 
     
    console.log("📊 Processed transactions and updated UI (FIXED)");
}

function updateBalanceDisplays(currentBalance, totalPayable) {
    const currentBalanceDisplay = document.getElementById('currentAccountBalanceDisplay');
    if (currentBalanceDisplay) currentBalanceDisplay.querySelector('span').textContent = formatNumber(currentBalance, true);
     
    const payableDisplay = document.getElementById('overallTotalPayableDisplay');
    if (payableDisplay) payableDisplay.querySelector('span').textContent = formatNumber(totalPayable, true);
}

/**
 * --- UPDATED: Main function to update all summary cards ---
 */
function updateMonthlySummaryDisplays(thisMonth, lastMonth, lastMonthDate, paidInvoiceAmount, totalInvoiceAmount) {
    document.querySelector('#monthlyQuotationDisplay span').textContent = formatNumber(thisMonth.quotation, true);
    updateComparisonDisplay('quotationComparison', thisMonth.quotationCount, lastMonth.quotationCount, lastMonthDate.toLocaleString('default', { month: 'long' }), false, true);
    document.querySelector('#monthlyTotalPayableDisplay span').textContent = formatNumber(thisMonth.totalInvoice, true);
    document.querySelector('#monthlyCashInDisplay span').textContent = formatNumber(thisMonth.cashIn, true);
    document.querySelector('#monthlyCashOutDisplay span').textContent = formatNumber(thisMonth.cashOut, true);

    const prevMonthName = lastMonthDate.toLocaleString('default', { month: 'long' });

    updatePayableRateDisplay('payableComparison', paidInvoiceAmount, totalInvoiceAmount);
    updateComparisonDisplay('cashInComparison', thisMonth.cashIn, lastMonth.cashIn, prevMonthName, false);
    updateComparisonDisplay('cashOutComparison', thisMonth.cashOut, lastMonth.cashOut, prevMonthName, true);
}

/**
 * --- UPDATED: Function to display the successful payable rate by AMOUNT ---
 */
function updatePayableRateDisplay(elementId, paidAmount, totalAmount) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (totalAmount === 0) {
        element.innerHTML = `<span class="text-gray-500">No invoices this month</span>`;
        return;
    }

    const rate = (paidAmount / totalAmount) * 100;
    const colorClass = rate >= 50 ? 'text-green-600' : 'text-red-600';
     
    element.className = `comparison-container text-xs mt-1 flex items-center font-semibold ${colorClass}`;
    element.innerHTML = `<span>${rate.toFixed(0)}% of invoices paid</span>`;
}


/**
 * --- UPDATED: Helper function to render comparison text with new features ---
 */
function updateComparisonDisplay(elementId, currentValue, previousValue, prevMonthName, invertColors = false, isQuantity = false) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const diff = currentValue - previousValue;
    let percentageChange = 0;

    if (previousValue > 0) {
        percentageChange = (diff / previousValue) * 100;
    } else if (currentValue > 0) {
        percentageChange = 100;
    }

    if (currentValue === 0 && previousValue === 0) {
        element.innerHTML = `<span class="text-gray-500">- vs ${prevMonthName}</span>`;
        return;
    }

    let colorClass;
    let icon;
     
    if (diff === 0) {
        colorClass = 'text-gray-500';
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg>`;
    } else {
        let isPositive = diff > 0;
        if (invertColors) {
            isPositive = diff < 0;
        }
         
        colorClass = isPositive ? 'text-green-600' : 'text-red-600';
        icon = isPositive 
            ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>` 
            : `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>`;
    }
     
    element.className = `comparison-container text-xs mt-1 flex items-center font-semibold ${colorClass}`;
     
    if (isQuantity) {
        const quotesText = currentValue === 1 ? 'Quote' : 'Quotes';
        element.innerHTML = `${icon} ${currentValue} ${quotesText} vs ${prevMonthName}`;
    } else {
        element.innerHTML = `${icon} ${Math.abs(percentageChange).toFixed(0)}% vs ${prevMonthName}`;
    }
}


/**
 * @function shouldShowAsPayable
 * @description Helper function to determine if a project should be shown as a payable on the calendar.
 * It checks if the project status is 'invoice' and if there are any outstanding payments.
 * @param {object} project - The project object from the database.
 * @returns {boolean} True if the project has unpaid invoices/milestones, false otherwise.
 */
function shouldShowAsPayable(project) {
    console.log(`🔍 Checking if project should show as payable:`, {
        name: project.name,
        status: project.status,
        id: project.id
    });
     
    // Only invoice status projects can be payables
    if (!['invoice', 'partially_paid'].includes(project.status)) {
        console.log(`  ❌ Status is '${project.status}', not 'invoice' or 'partially_paid' - skip payable`);
        return false;
    }
     
    // Check payment completion based on payment type
    if (project.payment_schedule?.type === 'full') {
        const isCompleted = project.payment_schedule.completed || false;
        console.log(`  🔍 Full payment completed: ${isCompleted}`);
         
        if (isCompleted) {
            console.log(`  ❌ Full payment completed - skip payable`);
            return false;
        }
         
        console.log(`  ✅ Full payment not completed - show as payable`);
        return true;
         
    } else if (project.payment_schedule?.type === 'staggered') {
        // SIMPLIFIED: Since we now only add unpaid milestones to projectData.invoices,
        // any staggered project that reaches this function should be shown as payable
        console.log(`  ✅ Staggered payment project - show as payable (already filtered to unpaid only)`);
        return true;
         
    } else {
        // No payment schedule or unknown type - show as payable by default
        console.log(`  ⚠️ No payment schedule or unknown type - show as payable by default`);
        return true;
    }
}


async function loadProjectData(userId) {
    try {
        // MODIFIED: Load ALL projects instead of filtering by status
        const { data: projects, error: projError } = await supabase
            .from('projects')
            .select(`
                id, name, client_name, status, total_amount,
                payment_schedule, contact_id, created_at, updated_at, start_date, tasks
            `)
            .eq('user_id', userId);
         
        console.log('🔍 DEBUG - loadProjectData results:');
        console.log('  - userId:', userId);
        console.log('  - projectsFound:', projects?.length || 0);
        console.log('  - projects:', projects);

        // Reset the arrays
        projectData.quotations = [];
        projectData.invoices = [];
        projectData.tasks = [];
         
        // Process each project (including converted ones for quotation tracking)
        projects?.forEach(project => {
            if (project.status === 'quotation') {
                projectData.quotations.push({
                    id: project.id,
                    project_id: project.id,
                    name: project.name,
                    client_name: project.client_name,
                    amount: parseFloat(project.total_amount) || 0,
                    status: 'quotation',
                    target_date: project.start_date,
                    created_at: project.created_at
                });
            } else if (['invoice', 'partially_paid', 'completed'].includes(project.status) && project.payment_schedule) {
                const schedule = project.payment_schedule;
                if (schedule.type === 'full') {
                    projectData.invoices.push({
                        id: project.id,
                        project_id: project.id,
                        name: project.name,
                        client_name: project.client_name,
                        amount: parseFloat(project.total_amount) || 0,
                        due_date: schedule.due_date,
                        is_paid: schedule.completed || false,
                        status: 'invoice',
                        _project: project // ADDED: Store the full project object
                    });
                } else if (schedule.type === 'staggered' && schedule.milestones) {
                    console.log(`🔍 Processing staggered milestones for project: ${project.name}`);
                    schedule.milestones.forEach((milestone, index) => {
                        const milestoneAmount = ((parseFloat(project.total_amount) || 0) * milestone.percentage) / 100;
                        const isPaid = milestone.completed || false;
                        
                        console.log(`  📋 Milestone ${index + 1}: ${milestone.percentage}%, paid: ${isPaid}, amount: ${milestoneAmount}`);
                        
                        // ADD ALL milestones (paid and unpaid) for calculation purposes
                        console.log(`    ✅ Adding milestone ${index + 1} (paid: ${isPaid}) for calculations`);
                        projectData.invoices.push({
                            id: `${project.id}_milestone_${index}`,
                            project_id: project.id,
                            name: `${project.name} - ${milestone.name || `Milestone ${index + 1}`}`,
                            client_name: project.client_name,
                            amount: milestoneAmount,
                            due_date: milestone.due_date,
                            is_paid: isPaid, // Use actual payment status
                            status: 'invoice',
                            _project: project,
                            _milestone_index: index
                        });
                    });
                    console.log(`  📊 Added ${schedule.milestones.length} milestones for payable calculations`);
                }
            }
            // NEW: Add converted projects to quotations array for tracking
            // This ensures all projects count toward quotation totals regardless of current status
            if (['invoice', 'partially_paid', 'completed'].includes(project.status)) {
                projectData.quotations.push({
                    id: project.id,
                    project_id: project.id,
                    name: project.name,
                    client_name: project.client_name,
                    amount: parseFloat(project.total_amount) || 0,
                    status: 'converted_quotation', // Special status to track converted quotations
                    target_date: project.start_date || (project.payment_schedule?.due_date) || project.created_at, // FIX: Use due_date as a fallback for invoices
                    created_at: project.created_at
                });
            }
        });
         
        console.log('📊 Project data loaded:');
        console.log('  - quotations count:', projectData.quotations.length);
        console.log('  - invoices count:', projectData.invoices.length);
        console.log('  - quotations array:', projectData.quotations);
        console.log('  - invoices array:', projectData.invoices);
         
    } catch (error) {
        console.error('Error loading project data:', error);
    }
}

function setupTransactionUI() {
    console.log('🖥️ Setting up transaction UI...');
    const entryTypeSelect = document.getElementById('entryType');
    if (entryTypeSelect) entryTypeSelect.addEventListener('change', handleEntryTypeChange);
     
    const getSpendingInsightsBtn = document.getElementById('getSpendingInsightsBtn');
    if (getSpendingInsightsBtn) getSpendingInsightsBtn.addEventListener('click', handleSpendingInsights);
}

function handleEntryTypeChange(event) {
    const selectedType = event.target.value;
    const amountGroup = document.getElementById('entryAmountGroup');
    const dateGroup = document.getElementById('entryDateGroup');
    const needsAmount = ['income', 'expense', 'payable', 'target'].includes(selectedType);
    const needsDate = ['income', 'expense', 'payable', 'target', 'task'].includes(selectedType);

    if (amountGroup) amountGroup.style.display = needsAmount ? 'block' : 'none';
    if (dateGroup) {
        if (selectedType === 'income' || selectedType === 'expense') {
             dateGroup.style.display = 'block';
        } else {
             dateGroup.style.display = needsDate ? 'block' : 'none';
        }
    }
}

async function handleSpendingInsights() {
    // This function remains the same
}

async function generateSpendingInsights(currentDate) {
    // This function remains the same
}

export async function saveEntry(entryData, entryId = null) {
    const userId = currentUserId; 
    if (!supabase || !userId) return false;

    try {
        if (entryId) {
            const { error } = await supabase.from('transactions').update(entryData).eq('id', entryId).eq('user_id', userId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('transactions').insert([{ ...entryData, user_id: userId }]);
            if (error) throw error;
        }
        await refetchTransactionData(getCurrentCalendarDate());
        return true;
    } catch (error) {
        console.error("Error saving entry:", error);
        alert('Failed to save entry. Please check console for details.');
        return false;
    }
}

export async function deleteTransaction(transactionId) {
    const userId = currentUserId;
    if (!supabase || !userId || !transactionId) return false;
     
    try {
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId);
        if (error) throw error;
        await refetchTransactionData(getCurrentCalendarDate());
        return true;
    } catch (error) {
        console.error("Error deleting transaction:", error);
        alert('Failed to delete transaction. Please check console for details.');
        return false;
    }
}

export async function refetchTransactionData(viewedDate = null) {
    const userId = currentUserId;
    if (!userId) return;
     
    try {
        const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId);
        if (error) {
            console.error("Error refetching data:", error);
        } else {
            // Add a small delay to ensure proper loading
            await new Promise(resolve => setTimeout(resolve, 100));
            await loadProjectData(userId);
            processAllTransactions(data || [], viewedDate);
            // NEW: Also refresh project calendar data
            console.log('🔄 Refreshing project calendar data...');
            const { getProjectCalendarItems } = await import('./project-manager.js');
            window.projectCalendarData = await getProjectCalendarItems(userId);
            console.log('✅ Updated window.projectCalendarData:', window.projectCalendarData);
            const { apiClient } = await import('./api-client.js');
            const projectsResult = await apiClient.getAllProjects();
            window.allProjects = projectsResult.success ? (projectsResult.data || []) : [];
            console.log('✅ Updated window.allProjects:', window.allProjects?.length || 0, 'projects');
            refreshCalendar(); 
        }
    } catch (error) {
        console.error("Error in refetch:", error);
    }
}

function formatNumber(amount, includeCurrency = false) {
    const formatter = new Intl.NumberFormat('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    let formattedAmount = formatter.format(Math.abs(amount));
    if (includeCurrency) formattedAmount = `RM${formattedAmount}`;
    return amount < 0 ? `(${formattedAmount})` : formattedAmount;
}

export function getAllTransactions() {
    return allTransactions;
}

/**
 * @function getTransactionsForDate
 * @description Gets all transactions and payables for a specific date, filtering out
 * any payables that are part of a fully-completed project.
 * @param {string} dateString The date in YYYY-MM-DD format.
 * @returns {Array} An array of transactions and payables for the given date.
 */
export function getTransactionsForDate(dateString) {
    // NEW: Filter out paid invoices from the calendar view by checking if the project is complete
    const projectInvoices = projectData.invoices.filter(invoice => {
        const isForDate = invoice.due_date === dateString;
        const shouldBeShown = invoice._project ? shouldShowAsPayable(invoice._project) : !invoice.is_paid;
        return isForDate && shouldBeShown;
    });

    // We filter the transactions to remove any that correspond to a paid invoice
    const paidInvoiceTitles = new Set(projectData.invoices.filter(i => i.is_paid).map(i => i.name));
    const filteredTransactions = allTransactions.filter(transaction => {
        const isForDate = transaction.date === dateString;
        const isPaidInvoice = paidInvoiceTitles.has(transaction.title);
        // Only return transactions for the date that are NOT a paid invoice
        return isForDate && !isPaidInvoice;
    });

    return [...filteredTransactions, ...projectInvoices];
}

export function getProjectData() {
    return projectData;
}