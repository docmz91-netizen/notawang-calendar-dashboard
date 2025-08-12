/**
 * modals.js - Modal Management System
 * Handles all modal functionality including transaction entry and insights
 */

// Import necessary functions from other modules.
// Assuming these are all correctly implemented and handle data persistence.
import { saveEntry, deleteTransaction, getTransactionsForDate, getProjectData } from './transactions.js';
import { getProjectItemsForDate, getProjectItemColor } from './project-manager.js';
import { navigateToPage } from './navigation.js';
import { handleTaskClick } from './calendar.js'; // Import the task click handler
import { openProjectModalForProject } from './project-form-modal.js'; // Import the project modal handler

// --- Manage selected date locally to remove dependency on calendar.js ---
let currentSelectedDate = null;

/**
 * Sets the currently selected date.
 * @param {string} date - Date string in YYYY-MM-DD format.
 */
export function setCurrentSelectedDate(date) {
    currentSelectedDate = date;
}

/**
 * Gets the currently selected date.
 * @returns {string|null} The selected date string or null if none is selected.
 */
export function getCurrentSelectedDate() {
    return currentSelectedDate;
}

/**
 * Initialize the modal system by setting up all event listeners.
 */
export function initializeModals() {
    console.log('🪟 Initializing modal system...');
    setupModalEventListeners();
    console.log('✅ Modal system initialized');
}

/**
 * Sets up event listeners for modal buttons.
 * This function also exposes key modal functions to the global scope for convenience
 * and backward compatibility with older HTML.
 */
function setupModalEventListeners() {
    // Exposing functions globally for legacy or direct HTML calls.
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.closeInsightsModal = closeInsightsModal;
    window.editEntry = editEntry;
    window.saveEntry = handleSaveEntry;
    window.deleteTransaction = handleDeleteTransaction;

    // Attach event listeners directly to the buttons for modern, cleaner code.
    const saveEntryButton = document.getElementById('saveEntryButton');
    const closeExpenseModalBtn = document.getElementById('closeExpenseModalBtn');
    const cancelEntryButton = document.getElementById('cancelEntryButton');

    if (saveEntryButton) {
        // We'll use a single handler for the save button.
        saveEntryButton.addEventListener('click', handleSaveEntry);
    }

    if (closeExpenseModalBtn) {
        closeExpenseModalBtn.addEventListener('click', closeModal);
    }
    if (cancelEntryButton) {
        cancelEntryButton.addEventListener('click', closeModal);
    }
}

/**
 * Open the main transaction modal for a specific date.
 * @param {string} dateString - Date string in YYYY-MM-DD format.
 */
function openModal(dateString) {
    console.log(`🪟 Opening modal for date: ${dateString}`);
    setCurrentSelectedDate(dateString);
    
    const modalDateTitle = document.getElementById('modalDateTitle');
    if (modalDateTitle) {
        modalDateTitle.textContent = new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
    }
    
    // Reset the form and then render the entries for the selected date.
    resetTransactionForm();
    renderCurrentDayEntries(dateString);
    
    const expenseModal = document.getElementById('expenseModal');
    if (expenseModal) {
        expenseModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => expenseModal.classList.add('is-active'), 10);
    }
}

/**
 * Close the main transaction modal.
 */
function closeModal() {
    const expenseModal = document.getElementById('expenseModal');
    if (expenseModal) {
        expenseModal.classList.remove('is-active');
        document.body.classList.remove('modal-open');
        expenseModal.addEventListener('transitionend', function handler() {
            if (!expenseModal.classList.contains('is-active')) {
                expenseModal.style.display = 'none';
                expenseModal.removeEventListener('transitionend', handler);
            }
        });
    }
    setCurrentSelectedDate(null);
}

/**
 * Close the insights modal.
 */
function closeInsightsModal() {
    const spendingInsightsModal = document.getElementById('spendingInsightsModal');
    if (spendingInsightsModal) {
        spendingInsightsModal.classList.remove('is-active');
        document.body.classList.remove('modal-open');
        spendingInsightsModal.addEventListener('transitionend', function handler() {
            if (!spendingInsightsModal.classList.contains('is-active')) {
                spendingInsightsModal.style.display = 'none';
                spendingInsightsModal.removeEventListener('transitionend', handler);
            }
        });
    }
}

/**
 * Reset the transaction form to its default state.
 */
function resetTransactionForm() {
    const formIds = ['editingEntryId', 'entryType', 'entryAmount', 'entryTitle', 'entryDescription', 'entryDate'];
    const elements = formIds.reduce((acc, id) => ({ ...acc, [id]: document.getElementById(id) }), {});
    
    // Clear all form fields.
    if (elements.editingEntryId) elements.editingEntryId.value = '';
    if (elements.entryType) elements.entryType.value = 'none';
    if (elements.entryAmount) elements.entryAmount.value = '';
    if (elements.entryTitle) elements.entryTitle.value = '';
    if (elements.entryDescription) elements.entryDescription.value = '';
    
    // Update button text to "Add" for new entries.
    const saveButton = document.getElementById('saveEntryButton');
    if (saveButton) saveButton.textContent = 'Add';
    
    // Hide date and show amount by default.
    const entryAmountGroup = document.getElementById('entryAmountGroup');
    if (entryAmountGroup) entryAmountGroup.style.display = 'block';
    
    const entryDateGroup = document.getElementById('entryDateGroup');
    if (entryDateGroup) entryDateGroup.style.display = 'none';
    if (elements.entryDate) elements.entryDate.value = getCurrentSelectedDate();
}

/**
 * Populate the form for editing an entry.
 * @param {string} entryId - ID of the entry to edit.
 */
function editEntry(entryId) {
    const transactions = getTransactionsForDate(getCurrentSelectedDate());
    const entryToEdit = transactions.find(entry => entry.id === entryId);
    
    if (!entryToEdit) {
        console.error('Entry not found:', entryId);
        return;
    }
    
    const formIds = ['editingEntryId', 'entryType', 'entryTitle', 'entryDescription', 'entryAmount', 'entryDate'];
    const elements = formIds.reduce((acc, id) => ({ ...acc, [id]: document.getElementById(id) }), {});

    // Populate the form fields with the entry's data.
    if (elements.editingEntryId) elements.editingEntryId.value = entryToEdit.id;
    if (elements.entryType) elements.entryType.value = entryToEdit.type;
    if (elements.entryTitle) elements.entryTitle.value = entryToEdit.title || '';
    if (elements.entryDescription) elements.entryDescription.value = entryToEdit.description || '';
    
    // Update button text to "Update" for edits.
    const saveButton = document.getElementById('saveEntryButton');
    if (saveButton) saveButton.textContent = 'Update';

    const entryAmountGroup = document.getElementById('entryAmountGroup');
    const entryDateGroup = document.getElementById('entryDateGroup');
    
    // Handle form field visibility based on entry type.
    if (entryAmountGroup) entryAmountGroup.style.display = 'none';
    if (entryDateGroup) entryDateGroup.style.display = 'none';

    switch (entryToEdit.type) {
        case 'task':
            if (entryDateGroup) entryDateGroup.style.display = 'block';
            if (elements.entryDate) elements.entryDate.value = entryToEdit.date;
            break;
        case 'payable':
        case 'target':
            if (entryAmountGroup) entryAmountGroup.style.display = 'block';
            if (entryDateGroup) entryDateGroup.style.display = 'block';
            if (elements.entryAmount) elements.entryAmount.value = entryToEdit.amount;
            if (elements.entryDate) elements.entryDate.value = entryToEdit.date;
            break;
        default:
            // For income/expense, show amount and use the current day's date.
            if (entryAmountGroup) entryAmountGroup.style.display = 'block';
            if (elements.entryAmount) elements.entryAmount.value = entryToEdit.amount;
            if (elements.entryDate) elements.entryDate.value = getCurrentSelectedDate();
    }
}

/**
 * Handles the saving of a new or edited entry.
 */
async function handleSaveEntry() {
    const selectedDate = getCurrentSelectedDate();
    if (!selectedDate) {
        console.error('No date selected');
        return;
    }

    // Include all form fields here, excluding entryDescription.
    const formIds = ['editingEntryId', 'entryType', 'entryTitle', 'entryAmount', 'entryDate'];
    const elements = formIds.reduce((acc, id) => ({ ...acc, [id]: document.getElementById(id) }), {});

    if (!elements.editingEntryId || !elements.entryType || !elements.entryTitle) {
        console.error('Required form elements not found');
        return;
    }

    const entryId = elements.editingEntryId.value;
    const selectedType = elements.entryType.value;
    const title = elements.entryTitle.value.trim();
    // Since no description field exists, we set it to an empty string.
    const description = ''; 

    if (entryId && entryId.startsWith('project_task_')) {
        // Use a custom modal instead of alert for better UI/UX.
        alert('Please edit project tasks from the Contacts page.');
        return;
    }
    
    if (selectedType === 'none' || !title) {
        alert("Please select an entry type and provide a title.");
        return;
    }
    
    const entryDateValue = (['task', 'payable', 'target'].includes(selectedType)) 
        ? elements.entryDate.value 
        : selectedDate;
    
    const amount = (selectedType !== 'task') ? parseFloat(elements.entryAmount.value) : 0;
    if (selectedType !== 'task' && isNaN(amount)) {
        alert("Invalid amount.");
        return;
    }

    // Pass the description to the saveEntry function.
    const entryData = { date: entryDateValue, type: selectedType, title, description, amount };
    const success = await saveEntry(entryData, entryId || null);
    
    if (success) {
        // Close the modal after a successful save.
        closeModal(); 
    } else {
        alert('Failed to save entry. Please try again.');
    }
}

/**
 * Handles the deletion of a transaction.
 * @param {string} transactionId - The ID of the transaction to delete.
 */
async function handleDeleteTransaction(transactionId) {
    if (transactionId.includes('_milestone_') || transactionId.startsWith('invoice_due_')) {
        alert('This is a project invoice and cannot be deleted here. Please edit the project from the Contacts page to update its status.');
        return;
    }
    
    // TODO: Replace this with a custom confirmation modal.
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    const success = await deleteTransaction(transactionId);
    if (success) {
        const selectedDate = getCurrentSelectedDate();
        if (selectedDate) renderCurrentDayEntries(selectedDate);
    } else {
        alert('Failed to delete transaction. Please try again.');
    }
}

/**
 * Renders all entries for the currently selected day, with deduplication.
 * This is the central rendering function for the modal's list.
 * @param {string} dateString - The date to render entries for.
 */
function renderCurrentDayEntries(dateString) {
    const listEl = document.getElementById('currentDayEntriesList');
    if (!listEl) return;
    
    listEl.innerHTML = ''; // Clear previous entries
    
    const transactions = getTransactionsForDate(dateString);
    const projectItems = window.projectCalendarData ? getProjectItemsForDate(window.projectCalendarData, dateString) : [];
    
    console.log('Debug - Date:', dateString);
    console.log('Debug - Project Items found:', projectItems);
    console.log('Debug - Project Calendar Data:', window.projectCalendarData);
    
    // Find all project tasks for the current day.
    const calendarTasks = [];
    if (window.allProjects) {
        window.allProjects.forEach(project => {
            if (project.tasks && Array.isArray(project.tasks)) {
                project.tasks.forEach((task, taskIndex) => {
                    if (task.due_date === dateString) {
                        calendarTasks.push({ 
                            ...task, 
                            type: 'project_task', 
                            projectName: project.name, 
                            projectId: project.id, 
                            taskIndex,
                            contact_id: project.contact_id
                        });
                    }
                });
            }
        });
    }

    // NEW: Filter out paid invoices from projectItems before combining.
    // This helps avoid showing paid items in the list.
    const unpaidProjectItems = projectItems.filter(item => {
        return item.type !== 'invoice' || !item.is_paid;
    });

    // Deduplication logic to prevent duplicate entries from different sources.
    const seenEntries = new Set();
    const deduplicatedEntries = [];
    
    // Helper function to create a unique key for each entry.
    function createEntryKey(entry) {
        console.log('🔑 Creating key for entry:', entry);
        
        const entryDate = entry.due_date || entry.date || getCurrentSelectedDate();
        const entryAmount = entry.amount || 0;
        
        // ENHANCED: Handle task deduplication
        if (entry.type === 'project_task' || entry.type === 'task_due' || entry.title?.includes('Task:')) {
            // FIX: Normalize task description from different sources
            let taskDescription = '';
            
            if (entry.type === 'project_task') {
                // From modals.js calendarTasks - description is the task name
                taskDescription = entry.description || 'untitled';
            } else if (entry.type === 'task_due') {
                // From project-manager.js - title is "Task: {name}", extract the name
                taskDescription = entry.title?.replace('Task: ', '') || entry.description || 'untitled';
            } else {
                // Fallback for other task-like entries
                taskDescription = entry.description || entry.title?.replace('Task: ', '') || 'untitled';
            }
            
            // FIX: Handle undefined project_id by using task description + date as primary key
            // Don't rely on project ID if it might be undefined
            let projectIdentifier = '';
            
            // Try to get project identifier from multiple sources
            if (entry.projectId && entry.projectId !== 'undefined') {
                projectIdentifier = entry.projectId;
            } else if (entry.project_id && entry.project_id !== 'undefined') {
                projectIdentifier = entry.project_id;
            } else if (entry.projectName) {
                projectIdentifier = entry.projectName;
            } else {
                // Extract project name from description/title as fallback
                const taskText = `${entry.description || ''} ${entry.title || ''}`;
                if (taskText.includes('Web Maintenance')) {
                    projectIdentifier = 'Web Maintenance';
                } else {
                    // Use a generic identifier for tasks without clear project association
                    projectIdentifier = 'standalone';
                }
            }
            
            // Create key using task description + date as primary identifier
            // This ensures tasks with same description on same date are deduplicated
            const normalizedDesc = taskDescription.toLowerCase().replace(/\s+/g, '_');
            const key = `task_${normalizedDesc}_${entryDate}`;
            
            console.log('🔑 Task key (fixed):', key, 'for description:', taskDescription);
            return key;
        }
        
        // ENHANCED: Extract project name from title/name for better matching
        let projectName = '';
        const titleText = entry.title || entry.name || '';
        
        if (titleText.includes('Web Maintenance')) {
            projectName = 'Web Maintenance';
        } else if (entry.project_name) {
            projectName = entry.project_name;
        } else if (entry.projectName) {
            projectName = entry.projectName;
        }
        
        // For ALL project-related entries with same project name, date, and amount
        if (projectName && entryAmount > 0) {
            const key = `project_entry_${projectName}_${entryDate}_${entryAmount}`;
            console.log('🔑 Project entry key:', key);
            return key;
        }
        
        // Fallback for other entries
        const key = `fallback_${entry.title || entry.name || 'no-title'}_${entryAmount}_${entry.type}`;
        console.log('🔑 Fallback key:', key);
        return key;
    }
    
    // Process all entry sources and deduplicate.
    const allEntries = [...calendarTasks, ...unpaidProjectItems, ...transactions];
    
    allEntries.forEach(entry => {
        const entryKey = createEntryKey(entry);
        
        if (!seenEntries.has(entryKey)) {
            seenEntries.add(entryKey);
            deduplicatedEntries.push(entry);
        } else {
            console.log(`🔍 Duplicate entry filtered out:`, entry.title || entry.name, entryKey);
        }
    });

    console.log(`📋 Total entries: ${allEntries.length}, After deduplication: ${deduplicatedEntries.length}`);

    if (deduplicatedEntries.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No entries for this day yet.</p>';
        return;
    }
    
    // Create a document fragment to batch DOM appends for performance.
    const fragment = document.createDocumentFragment();

    deduplicatedEntries.forEach(entry => {
        fragment.appendChild(createEntryCard(entry));
    });

    listEl.appendChild(fragment);
}

/**
 * Helper function to create an entry card for the modal list.
 * @param {object} entry - The entry data.
 * @returns {HTMLElement} The created card element.
 */
function createEntryCard(entry) {
    // ADD THIS TEMPORARY DEBUG LOG
    console.log('🔍 DEBUG - Entry being processed:', entry);
    console.log('🔍 DEBUG - Entry type:', entry.type);
    console.log('🔍 DEBUG - Entry project_id:', entry.project_id);
    console.log('🔍 DEBUG - Entry id:', entry.id);
    console.log('🔍 DEBUG - Entry title:', entry.title);
    
    const card = document.createElement('div');
    const { bgColor, textColor, iconColor, icon } = getEntryStyling(entry.type);
    
    // Add cursor-pointer for clickable items
    const isClickable = entry.type === 'project_task' || 
                        entry.type === 'invoice_due' || 
                        entry.type === 'payable' || 
                        isProjectRelatedIncome(entry);
    card.className = `flex items-center p-3 rounded-lg transition-all duration-200 mb-2 ${bgColor} hover:shadow-md ${isClickable ? 'cursor-pointer' : ''}`;
    card.dataset.id = entry.id;

    const iconContainer = document.createElement('div');
    iconContainer.className = `flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 ${iconColor}`;
    iconContainer.innerHTML = icon;
    
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'flex-grow';
    
    const title = document.createElement('p');
    title.className = `font-semibold ${textColor}`;
    
    const description = document.createElement('p');
    description.className = `text-sm ${textColor} opacity-70`;

    // --- FIX: Correctly assign Task Name and Project Name ---
    if (entry.type === 'project_task') {
        // The task name is stored in the 'description' property of the task object
        title.textContent = entry.description || 'Untitled Task'; // Task name is the main title
        description.textContent = entry.projectName || 'Untitled Project'; // Project name is the subtitle
    } else {
        // Fallback for other entry types
        title.textContent = entry.title || entry.name || 'Untitled';
        description.textContent = entry.description || '';
    }

    detailsContainer.appendChild(title);
    if (description.textContent) {
        detailsContainer.appendChild(description);
    }

    const amountContainer = document.createElement('div');
    amountContainer.className = `text-right flex-shrink-0 ml-4`;

    if (entry.type !== 'project_task' && entry.type !== 'task') {
        const amountText = document.createElement('p');
        amountText.className = `font-bold text-sm ${textColor}`;
        amountText.textContent = formatNumber(entry.amount, true);
        amountContainer.appendChild(amountText);
    }
    
    // --- MODIFIED: The delete button is only added for 'income' and 'expense' types ---
    if (entry.type === 'income' || entry.type === 'expense') {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'text-gray-400 hover:text-red-500 transition-colors duration-200 opacity-50 hover:opacity-100';
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`;
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            handleDeleteTransaction(entry.id);
        };
        amountContainer.appendChild(deleteButton);
    }

    card.appendChild(iconContainer);
    card.appendChild(detailsContainer);
    card.appendChild(amountContainer);

    // Handle click events
    card.addEventListener('click', () => {
        if (entry.type === 'project_task') {
            // --- FIX: Close the daily modal before opening the project modal ---
            closeModal();
            // Use a short timeout to allow the close animation to start
            setTimeout(() => {
                handleTaskClick(entry.projectId);
            }, 150); // A delay of 150ms is usually enough for a smooth transition
        } else if (entry.type === 'invoice_due' || 
                   entry.type === 'payable' || 
                   (entry.id && entry.id.toString().includes('_milestone_')) ||
                   (entry.project_id && entry.due_date && !entry.is_paid) ||
                   isProjectRelatedIncome(entry)) {
            // --- FIXED: Detect milestone, payable, and project income entries more reliably ---
            closeModal();
            setTimeout(() => {
                let projectId = null;
                // For milestone entries, extract the project ID from the milestone ID
                if (entry.id && entry.id.toString().includes('_milestone_')) {
                    projectId = entry.id.toString().split('_milestone_')[0];
                } else if (entry.project_id) {
                    projectId = entry.project_id;
                } else if (isProjectRelatedIncome(entry)) {
                    projectId = extractProjectIdFromIncome(entry);
                }

                if (projectId) {
                    console.log('🔍 Opening project modal for project ID:', projectId);
                    // Find the full project and contact objects
                    const project = window.allProjects?.find(p => p.id === projectId);
                    if (project) {
                        const contact = window.allContacts?.find(c => c.id === project.contact_id);
                        if (contact) {
                            // Import the correct function and use it properly
                            import('./project-form-modal.js').then(module => {
                                module.projectFormModal.openForEdit(project, contact);
                            });
                        } else {
                            // NEW: Handle missing contact gracefully
                            console.error('Contact not found for project:', project.id);
                            alert(`❌ Cannot open project: Contact information is missing.\n\nProject: ${project.name}\nContact ID: ${project.contact_id}\n\nPlease update the project's contact or delete the project.`);
                        }
                    } else {
                        console.error('Project not found with ID:', projectId);
                        alert('❌ Project not found.');
                    }
                } else {
                    console.error('Project ID not found for this entry:', entry);
                }
            }, 150);
        } else {
            // For other types (income, expense), open the edit form
            editEntry(entry.id);
        }
    });

    return card;
}

// --- NEW: Helper functions to detect project-related income ---
function isProjectRelatedIncome(entry) {
    if (entry.type !== 'income') return false;
    
    const title = entry.title || '';
    const description = entry.description || '';
    
    // Check for common project income patterns
    const projectPatterns = [
        /milestone payment from/i,
        /payment for.*quotation/i,
        /project.*payment/i,
        /milestone.*payment/i,
        /quotation.*\d+/i, // Matches "Quotation 4", "Quotation 5", etc.
        /payment.*milestone/i
    ];
    
    return projectPatterns.some(pattern => 
        pattern.test(title) || pattern.test(description)
    );
}

function extractProjectIdFromIncome(entry) {
    const title = entry.title || '';
    const description = entry.description || '';
    const text = `${title} ${description}`.toLowerCase();
    
    // Try to extract project ID from milestone payment titles
    // Looking for patterns like "Milestone payment from Quotation 4"
    const quotationMatch = text.match(/quotation\s+(\d+)/i);
    if (quotationMatch) {
        // Find project by name containing "Quotation X"
        const quotationName = `Quotation ${quotationMatch[1]}`;
        const project = (window.allProjects || []).find(p => 
            p.name && p.name.toLowerCase().includes(quotationName.toLowerCase())
        );
        if (project) return project.id;
    }
    
    // Try to extract from "Milestone payment from [Project Name]"
    const milestoneMatch = text.match(/milestone payment from (.+)/i);
    if (milestoneMatch) {
        const projectName = milestoneMatch[1].trim();
        const project = (window.allProjects || []).find(p => 
            p.name && p.name.toLowerCase().includes(projectName.toLowerCase())
        );
        if (project) return project.id;
    }
    
    // Try to find project by partial name match
    const project = (window.allProjects || []).find(p => {
        if (!p.name) return false;
        const projectName = p.name.toLowerCase();
        return text.includes(projectName) || projectName.includes(text.split(' ')[0]);
    });
    
    return project ? project.id : null;
}

// --- UIUX Improvement: Helper for styling and icons ---
function getEntryStyling(type) {
    const styles = {
        income: { bgColor: 'bg-green-50', textColor: 'text-green-800', iconColor: 'bg-green-200', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v12m6-6H6" /></svg>` },
        expense: { bgColor: 'bg-red-50', textColor: 'text-red-800', iconColor: 'bg-red-200', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6" /></svg>` },
        payable: { bgColor: 'bg-yellow-50', textColor: 'text-yellow-800', iconColor: 'bg-yellow-200', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` },
        project_task: { bgColor: 'bg-blue-50', textColor: 'text-blue-800', iconColor: 'bg-blue-200', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>` },
        task: { bgColor: 'bg-indigo-50', textColor: 'text-indigo-800', iconColor: 'bg-indigo-200', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` },
        default: { bgColor: 'bg-gray-50', textColor: 'text-gray-800', iconColor: 'bg-gray-200', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` }
    };
    return styles[type] || styles.default;
}

function formatNumber(amount, includeCurrency = false) {
    const formatter = new Intl.NumberFormat('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    let formattedAmount = formatter.format(Math.abs(amount));
    if (includeCurrency) {
        formattedAmount = `RM${formattedAmount}`;
    }
    return amount < 0 ? `(${formattedAmount})` : formattedAmount;
}