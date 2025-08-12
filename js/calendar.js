/**
 * calendar.js - Calendar System
 * Handles calendar rendering with a clean summary view for each day.
 */
import { refetchTransactionData } from './transactions.js';
import { apiClient } from './api-client.js';
import { projectFormModal } from './project-form-modal.js';
import { getProjectCalendarItems } from './project-manager.js';
import { getTransactionsForDate } from './transactions.js';

let currentDate = new Date(2025, 7, 1); // August 2025 (month is 0-indexed, so 7 = August)
/**
 * Gets the current calendar date being viewed
 */
export function getCurrentCalendarDate() {
    console.log('getCurrentCalendarDate returning:', currentDate);
    return currentDate;
}

/**
 * Initializes the entire calendar system.
 */
export async function initializeCalendar() {
    console.log('📅 Initializing calendar system...');
    try {
        await loadAllCalendarData();
        setupCalendarNavigation();
        renderCalendar(currentDate);
        // ADD THIS NEW FUNCTION CALL
        setupMilestoneClickHandlers();
        console.log('✅ Calendar system initialized');
    } catch (error) {
        console.error('❌ Failed to initialize calendar:', error);
        window.allContacts = [];
        window.allProjects = [];
        window.projectCalendarData = { quotations: [], invoices: [], tasks: [] };
    }
}

/**
 * Fetches all data required for the calendar.
 */
async function loadAllCalendarData() {
    console.log('🔄 Loading all calendar data...');
    try {
        const [contactsResult, projectsResult, calendarItemsResult] = await Promise.all([
            apiClient.getContacts(),
            apiClient.getAllProjects(),
            getProjectCalendarItems(apiClient.userId)
        ]);

        window.allContacts = contactsResult.success ? (contactsResult.data || []) : [];
        window.allProjects = projectsResult.success ? (projectsResult.data || []) : [];
        window.projectCalendarData = calendarItemsResult || { quotations: [], invoices: [], tasks: [] };

    } catch (error) {
        console.error('❌ Could not load all calendar data:', error);
        window.allContacts = [];
        window.allProjects = [];
        window.projectCalendarData = { quotations: [], invoices: [], tasks: [] };
    }
}

/**
 * Sets up the 'Previous' and 'Next' month navigation buttons.
 */
function setupCalendarNavigation() {
    const prevMonthBtn = document.getElementById('prevMonthBtn') || document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonthBtn') || document.getElementById('nextMonth');

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', async () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(currentDate);
            await refetchTransactionData(currentDate); // NEW: Refresh monthly comparisons
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', async () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(currentDate);
            await refetchTransactionData(currentDate); // NEW: Refresh monthly comparisons
        });
    }
}

/**
 * Renders the main calendar grid for a given date.
 * @param {Date} date - The date to display the calendar for.
 */
export function renderCalendar(date) {
    const calendarGrid = document.getElementById('calendarDates') || document.getElementById('calendarGrid');
    const monthYearDisplay = document.getElementById('monthYear') || document.getElementById('monthYearDisplay');
    
    if (!calendarGrid || !monthYearDisplay) {
        console.error('Calendar UI elements not found in the DOM.');
        return;
    }
    
    calendarGrid.innerHTML = '';
    const year = date.getFullYear();
    const month = date.getMonth();
    monthYearDisplay.textContent = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const tasksByDate = new Map();
    (window.allProjects || []).forEach(project => {
        if (project.tasks && Array.isArray(project.tasks)) {
            project.tasks.forEach(task => {
                if (task.due_date) {
                    const dateKey = task.due_date;
                    if (!tasksByDate.has(dateKey)) tasksByDate.set(dateKey, []);
                    tasksByDate.get(dateKey).push(task);
                }
            });
        }
    });

    // ADD THIS DEBUG BLOCK HERE:
    console.log('🔍 DEBUG renderCalendar task processing:');
    console.log('  - Total projects processed:', (window.allProjects || []).length);
    console.log('  - Tasks found by date:', Object.fromEntries(tasksByDate));
    console.log('  - Total dates with tasks:', tasksByDate.size);

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Correctly calculates the day offset for a Monday-first calendar.
    // getDay() returns 0 for Sunday, so we map 0 to 6 to place it at the end of the week.
    const dayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = dayOffset; i > 0; i--) {
        calendarGrid.appendChild(createDayCell(prevMonthLastDay - i + 1, month - 1, year, false, []));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const fullDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const tasksForDay = tasksByDate.get(fullDateString) || [];
        calendarGrid.appendChild(createDayCell(day, month, year, true, tasksForDay));
    }
    
    const totalCells = dayOffset + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        calendarGrid.appendChild(createDayCell(i, month + 1, year, false, []));
    }
}

/**
 * --- UI/UX UPDATE ---
 * Creates a single day cell for the calendar grid with an improved layout.
 */
function createDayCell(day, month, year, isCurrentMonthDay, tasks) {
    const dateCell = document.createElement('div');
    dateCell.className = `date-cell p-2 flex flex-col min-h-[110px] border-t border-l border-gray-200 ${isCurrentMonthDay ? 'current-month bg-white hover:bg-gray-50 transition-colors duration-200' : 'other-month bg-gray-50 text-gray-400'}`;
    const fullDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    dateCell.addEventListener('click', () => {
        if (window.openModal) {
            window.openModal(fullDateString);
        }
    });

    // --- TOP ROW: Date number and net amount ---
    const topRow = document.createElement('div');
    // Remove ALL CSS classes and use only inline styles
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    topRow.style.alignItems = 'center';
    topRow.style.width = '100%';
    topRow.style.whiteSpace = 'nowrap';
    topRow.style.overflow = 'hidden';
    topRow.style.marginBottom = '4px';
    topRow.style.minHeight = '16px';

    const dateNumberSpan = document.createElement('span');
    // Remove CSS classes, use only inline styles
    dateNumberSpan.style.fontSize = '12px';
    dateNumberSpan.style.fontWeight = '600';
    dateNumberSpan.style.color = '#9ca3af';
    dateNumberSpan.style.flexShrink = '0';
    dateNumberSpan.textContent = day;

    const today = new Date();
    if (isCurrentMonthDay && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
        dateNumberSpan.style.backgroundColor = '#4f46e5';
        dateNumberSpan.style.color = '#ffffff';
        dateNumberSpan.style.borderRadius = '50%';
        dateNumberSpan.style.width = '20px';
        dateNumberSpan.style.height = '20px';
        dateNumberSpan.style.display = 'flex';
        dateNumberSpan.style.alignItems = 'center';
        dateNumberSpan.style.justifyContent = 'center';
    }
    topRow.appendChild(dateNumberSpan);
    
    const transactionsForDay = getTransactionsForDate(fullDateString) || [];
    // MODIFIED: Only count actual income and expense transactions, not payables
    const netAmount = transactionsForDay.reduce((sum, t) => {
        if (t.type === 'income') return sum + t.amount;
        if (t.type === 'expense') return sum - t.amount;
        // Do not include 'payable' or other types in the net amount
        return sum;
    }, 0);

    if (netAmount !== 0) {
        const netAmountEl = document.createElement('span');
        // Remove ALL CSS classes, use only inline styles
        netAmountEl.style.fontSize = '12px';
        netAmountEl.style.fontWeight = '600';
        netAmountEl.style.color = netAmount > 0 ? '#10b981' : '#ef4444';
        netAmountEl.style.flexShrink = '0';
        netAmountEl.style.whiteSpace = 'nowrap';
        netAmountEl.style.marginLeft = 'auto';
        netAmountEl.textContent = (netAmount > 0 ? '+' : '') + `RM${Math.abs(netAmount).toFixed(2)}`;
        topRow.appendChild(netAmountEl);
        
        // ADD THIS DEBUG CODE
        console.log('🔍 DEBUG topRow styles:', {
            display: topRow.style.display,
            justifyContent: topRow.style.justifyContent,
            width: topRow.style.width,
            childrenCount: topRow.children.length
        });
        console.log('🔍 DEBUG computed styles:', window.getComputedStyle(topRow));
        
        // FORCE THE LAYOUT ONE MORE TIME
        setTimeout(() => {
            topRow.style.position = 'relative';
            topRow.style.setProperty('display', 'flex', 'important');
            netAmountEl.style.position = 'absolute';
            netAmountEl.style.right = '0px';
            netAmountEl.style.top = '50%';
            netAmountEl.style.transform = 'translateY(-50%)';
            netAmountEl.style.lineHeight = '1';
        }, 100);
    }
    
    dateCell.appendChild(topRow);

    // Use a spacer to push content to the bottom, ensuring full width
    const spacer = document.createElement('div');
    spacer.className = 'flex-grow';
    dateCell.appendChild(spacer);

    const bottomContent = document.createElement('div');
    bottomContent.className = 'w-full space-y-1';

    const payablesForDay = transactionsForDay.filter(item => 
        item.due_date === fullDateString && !item.is_paid && item.amount) || [];
    
    if (tasks.length > 0) {
        const completedTasks = tasks.filter(t => t.completed).length;
        const totalTasks = tasks.length;
        const allCompleted = totalTasks === completedTasks;
        
        const taskLabel = document.createElement('div');
        let labelClass = 'w-full text-center text-xs font-medium rounded px-2 py-1 ';
        labelClass += allCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700';
        
        taskLabel.className = labelClass;
        taskLabel.textContent = `Tasks: ${completedTasks}/${totalTasks}`;
        bottomContent.appendChild(taskLabel);
    }
    
    if (payablesForDay.length > 0) {
        const totalPayable = payablesForDay.reduce((sum, p) => sum + (p.amount || 0), 0);
        const payableLabel = document.createElement('div');
        payableLabel.className = 'w-full text-center text-xs font-medium rounded px-2 py-1 bg-blue-100 text-blue-800';
        payableLabel.textContent = `RM${totalPayable.toFixed(2)}`;
        bottomContent.appendChild(payableLabel);
    }
    
    if (bottomContent.children.length > 0) {
        dateCell.appendChild(bottomContent);
    }
    
    return dateCell;
}

/**
 * Handles clicking on a project task. This is exported for use in modals.js.
 * @param {string} projectId - The ID of the project to open.
 */
export function handleTaskClick(projectId) {
    if (!projectId) return;
    const project = (window.allProjects || []).find(p => p.id === projectId);
    if (!project) {
        console.error(`Could not find project with ID: ${projectId}`);
        return;
    }
    const contact = (window.allContacts || []).find(c => c.id === project.contact_id);
    
    if (project && contact) {
        projectFormModal.openForEdit(project, contact);
    } else {
        console.error(`Could not find contact for project ID: ${projectId}`);
    }
}

/**
 * Sets up click handlers for milestone entries that are added by other systems
 */
export function setupMilestoneClickHandlers() {
    // Use a small delay to ensure milestone elements are rendered
    setTimeout(() => {
        const milestoneElements = document.querySelectorAll('.bg-blue-100.text-blue-800');
        
        milestoneElements.forEach(element => {
            // Ensure the element has a monetary value and doesn't already have an onclick handler
            if (element.textContent.includes('RM') && !element.onclick) {
                element.style.cursor = 'pointer';
                element.onclick = (event) => {
                    event.stopPropagation(); // Prevent the day cell's click handler from firing
                                        
                    // Extract amount from text (e.g., "RM250.00" -> 250)
                    const amountText = element.textContent.replace('RM', '').replace(',', '');
                    const amount = parseFloat(amountText);
                                        
                    // Find project with matching milestone amount
                    const project = window.allProjects?.find(p => 
                        p.payment_schedule?.milestones?.some(m => m.amount === amount)
                    );
                                        
                    if (project) {
                        const contact = window.allContacts?.find(c => c.id === project.contact_id);
                        if (contact) {
                            console.log('✅ Found project object:', project);
                            console.log('✅ Found contact object:', contact);
                            // Open modal first
                            projectFormModal.openForEdit(project, contact);

                            // THEN ensure form population with delay
                            setTimeout(() => {
                                const nameField = document.querySelector('[name="projectName"]');
                                const statusButtons = document.querySelectorAll('.status-btn');
                                
                                if (nameField && project.name) {
                                    nameField.value = project.name;
                                    console.log('✅ Force-populated name field:', project.name);
                                }
                                
                                statusButtons.forEach(btn => {
                                    if (btn.textContent.toLowerCase().includes(project.status.toLowerCase())) {
                                        btn.classList.add('active');
                                        btn.click();
                                        console.log('✅ Force-activated status:', project.status);
                                    }
                                });
                            }, 200);
                            
                            console.log('✅ Opened project modal for milestone click');
                        } else {
                            console.log('❌ Could not find contact for project:', project.id);
                        }
                    } else {
                        console.log('❌ Could not find project for milestone amount:', amount);
                    }
                };
            }
        });
    }, 100);
}

/**
 * Re-fetches all data and re-renders the calendar.
 */
export async function refreshCalendar() {
    console.log('🔄 Refreshing calendar display...');

    // ADD THIS DEBUG BLOCK HERE:
    console.log('🔍 DEBUG refreshCalendar data sources:');
    console.log('  - window.allProjects:', window.allProjects?.length || 0, 'projects');
    console.log('  - window.projectCalendarData:', window.projectCalendarData);
    console.log('  - projectCalendarData tasks:', window.projectCalendarData?.tasks?.length || 0);

    renderCalendar(currentDate);
}