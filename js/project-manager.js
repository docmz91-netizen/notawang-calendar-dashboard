import { supabase } from './supabase-client.js';
import { CONFIG } from './config.js';

/**
 * Project Management Module
 * Handles quotations, invoices, tasks, and project lifecycle
 */

// Get all project-related items for calendar display
export async function getProjectCalendarItems(userId) {
    console.log('getProjectCalendarItems called with userId:', userId);
    try {
        // FIXED: Fetch ALL project statuses to include tasks
        const { data: projects, error: projError } = await supabase
            .from('projects')
            .select(`
                id, name, client_name, status, total_amount,
                payment_schedule, contact_id, created_at, updated_at, start_date, tasks
            `) // Added 'tasks' column and removed status filter
            .eq('user_id', userId);

        console.log('Raw projects fetched (all statuses):', projects);
        if (projError) {
            console.error('Query error:', projError);
            throw projError;
        }

        const invoices = [];
        const quotations = [];
        const tasks = []; // NEW: Add tasks array
        
        projects?.forEach(project => {
            // Process invoices
            if (project.status === 'invoice' && project.payment_schedule) {
                const schedule = project.payment_schedule;
                if (schedule.type === 'full') {
                    invoices.push({
                        id: project.id,
                        project_name: project.name,
                        client_name: project.client_name,
                        amount: parseFloat(project.total_amount),
                        due_date: schedule.due_date,
                        is_paid: schedule.completed || false,
                        type: 'full',
                        contact_id: project.contact_id
                    });
                } else if (schedule.type === 'staggered' && schedule.milestones) {
                    schedule.milestones.forEach((milestone, index) => {
                        const milestoneAmount = (parseFloat(project.total_amount) * milestone.percentage) / 100;
                        invoices.push({
                            id: `${project.id}_milestone_${index}`,
                            project_id: project.id,
                            project_name: project.name,
                            client_name: project.client_name,
                            amount: milestoneAmount,
                            due_date: milestone.due_date,
                            is_paid: milestone.completed || false,
                            type: 'staggered',
                            milestone_percentage: milestone.percentage,
                            contact_id: project.contact_id
                        });
                    });
                }
            } 
            // Process quotations
            else if (project.status === 'quotation') {
                // FIX: Added 'valid_until' to the quotation object
                quotations.push({
                    id: project.id,
                    project_name: project.name,
                    client_name: project.client_name,
                    amount: parseFloat(project.total_amount),
                    target_date: project.start_date,
                    // Assuming 'valid_until' is a property on the project object for quotations
                    valid_until: project.valid_until,
                    contact_id: project.contact_id
                });
            }

            // NEW: Process tasks from ALL projects (regardless of status)
            if (project.tasks && Array.isArray(project.tasks)) {
                project.tasks.forEach((task, index) => {
                    if (task.due_date) { // Only add tasks with due dates
                        // FIX: Added 'completed_date' to the task object
                        tasks.push({
                            id: `${project.id}_task_${index}`,
                            project_id: project.id,
                            project_name: project.name,
                            client_name: project.client_name,
                            title: task.description,
                            description: task.description,
                            due_date: task.due_date,
                            completed: task.completed || false,
                            // Assuming 'completed_date' is a property on the task object
                            completed_date: task.completed_date,
                            contact_id: project.contact_id,
                            project_status: project.status
                        });
                    }
                });
            }
        });

        console.log('Processed Quotations:', quotations);
        console.log('Processed Invoices:', invoices);
        console.log('Processed Tasks:', tasks); // NEW: Log tasks

        return {
            quotations: quotations,
            invoices: invoices,
            tasks: tasks // NEW: Return tasks
        };

    } catch (error) {
        console.error('Error fetching project calendar items:', error);
        return { quotations: [], invoices: [], tasks: [] };
    }
}

// Get project summary for a specific date
export function getProjectItemsForDate(projectData, dateString) {
    const items = [];

    // Check quotations (expiring on this date)
    projectData.quotations.forEach(quote => {
        // FIX: Extract YYYY-MM-DD from the full date string for accurate comparison
        if (quote.valid_until && quote.valid_until.substring(0, 10) === dateString) {
            items.push({
                type: 'quotation_expiry',
                title: `Quote Expires: ${quote.quotation_number}`,
                description: `${quote.projects.name} - ${quote.projects.client_name}`,
                amount: quote.amount,
                status: quote.status,
                priority: quote.status === 'sent' ? 'high' : 'medium'
            });
        }
    });

    // Check invoices (due on this date)
    projectData.invoices.forEach(invoice => {
        // Use is_paid for checking status
        // --- FIX: Extract YYYY-MM-DD from the full date string for accurate comparison ---
        if (invoice.due_date && invoice.due_date.substring(0, 10) === dateString && !invoice.is_paid) {
            items.push({
                // --- FIX: Added id property to the item object ---
                id: invoice.id,
                type: 'invoice_due',
                title: `Invoice Due: ${invoice.project_name} - ${invoice.client_name}`,
                description: `RM${invoice.amount.toFixed(2)}`,
                amount: invoice.amount,
                status: 'due',
                priority: 'high'
            });
        }
        
        // Also check payment dates (income)
        // --- FIX: Extract YYYY-MM-DD from the full date string for accurate comparison ---
        if (invoice.due_date && invoice.due_date.substring(0, 10) === dateString && invoice.is_paid) {
            items.push({
                // --- FIX: Added id property to the item object ---
                id: invoice.id,
                type: 'payment_received',
                title: `Payment Received: ${invoice.project_name} - ${invoice.client_name}`,
                description: `RM${invoice.amount.toFixed(2)}`,
                amount: invoice.amount,
                status: 'paid',
                priority: 'medium'
            });
        }
    });

    // Check tasks (due on this date)
    projectData.tasks.forEach(task => {
        // FIX: Extract YYYY-MM-DD from the full date string for accurate comparison
        if (task.due_date && task.due_date.substring(0, 10) === dateString) {
            items.push({
                id: task.id, // Add id
                type: 'task_due',
                title: `Task: ${task.title}`,
                description: `${task.project_name} - ${task.client_name}`, // Fixed
                status: task.completed ? 'completed' : 'pending',
                priority: 'medium'
            });
        }
        
        // Also check completion dates
        // FIX: Extract YYYY-MM-DD from the full date string for accurate comparison
        if (task.completed_date && task.completed_date.substring(0, 10) === dateString && task.completed) {
            items.push({
                id: task.id, // Add id
                type: 'task_completed',
                title: `Completed: ${task.title}`,
                description: `${task.project_name} - ${task.client_name}`, // Fixed
                status: 'completed',
                priority: 'low'
            });
        }
    });

    return items;
}

// Create project-related transaction entries
export function createTransactionFromProject(projectItem, dateString) {
    switch (projectItem.type) {
        case 'payment_received':
            return {
                user_id: CONFIG.DEFAULT_USER_ID,
                date: dateString,
                type: 'income',
                title: projectItem.title,
                description: `Project payment: ${projectItem.description}`,
                amount: projectItem.amount
            };
        
        case 'invoice_due':
            // Create a "payable" entry for expected income
            return {
                user_id: CONFIG.DEFAULT_USER_ID,
                date: dateString,
                type: 'payable',
                title: projectItem.title,
                description: `Expected payment: ${projectItem.description}`,
                amount: projectItem.amount
            };
        
        default:
            return null;
    }
}

// Get color coding for project items
export function getProjectItemColor(item) {
    const colors = {
        'quotation_expiry': {
            'sent': '#f59e0b',
            'approved': '#10b981',
            'expired': '#ef4444',
            'draft': '#6b7280'
        },
        'invoice_due': {
            'sent': '#3b82f6',
            'overdue': '#ef4444',
            'paid': '#10b981'
        },
        'task_due': {
            'pending': '#f59e0b',
            'in_progress': '#3b82f6',
            'completed': '#10b981',
            'urgent': '#ef4444'
        },
        'payment_received': '#10b981',
        'task_completed': '#10b981'
    };

    if (item.type in colors) {
        if (typeof colors[item.type] === 'object') {
            return colors[item.type][item.status] || '#6b7280';
        }
        return colors[item.type];
    }
    
    return '#6b7280'; // default gray
}