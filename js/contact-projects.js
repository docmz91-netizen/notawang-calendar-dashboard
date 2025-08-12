/**
 * js/contact-projects.js
 * This module is responsible for rendering the projects list for a specific contact.
 */

import { apiClient } from './api-client.js';
import { projectFormModal } from './project-form-modal.js';
import { refreshCalendar } from './calendar.js'; // Import the refresh function
import { supabase } from './supabase-client.js';

// --- Status Configuration Function ---
// This function provides the display properties for each project status.
const getStatusConfig = (status) => {
    const statusConfigs = {
        'inquiry': {
            label: 'INQUIRY',
            class: 'bg-gray-100 text-gray-700 border border-gray-300'
        },
        'quotation': {
            label: 'QUOTATION',
            class: 'bg-yellow-100 text-yellow-700 border border-yellow-300'
        },
        'invoice': {
            label: 'INVOICE',
            class: 'bg-red-100 text-red-700 border border-red-300'
        },
        'partially_paid': {
            label: 'PARTIALLY PAID',
            class: 'bg-blue-100 text-blue-700 border border-blue-300'
        },
        'completed': {
            label: 'COMPLETED',
            class: 'bg-green-100 text-green-700 border border-green-300'
        }
    };

    // Return config for the status, or a default if it's unknown
    return statusConfigs[status] || {
        label: 'UNKNOWN',
        class: 'bg-gray-100 text-gray-500 border border-gray-300'
    };
};


// --- Main Exported Function ---
export async function createContactProjects(contact, container, timelineComponent) {
    console.log(`🚀 Initializing projects component for contact: ${contact.id}`);

    const component = new ContactProjects(contact, container, timelineComponent);
    await component.loadAndRender();

    // This callback now correctly handles both create and update logic
    projectFormModal.setSaveCallback(async (projectData, projectId) => {
        try {
            let result;

            // Handle deletion case where projectData is null
            if (!projectData) {
                // If projectData is null, it's a delete operation. Just refresh.
                await component.loadAndRender(); // Refresh the project list on the contact page
                await component.refreshTimeline(); // Refresh the activity timeline
                await refreshCalendar(); // Refresh the main dashboard calendar
                return true;
            }

            // --- Handle transaction logic for updates ---
            if (projectId) {
                console.log(`Saving updates for project ID: ${projectId}`);

                const { data: existingProject, error: fetchError } = await supabase
                    .from('projects')
                    .select('payment_schedule, name, total_amount, contact_id')
                    .eq('id', projectId)
                    .single();

                if (fetchError) {
                    console.error('Error fetching existing project:', fetchError);
                    return false;
                }

                // Get the user ID from the Supabase auth session, with a fallback
                const { data: { user } } = await supabase.auth.getUser();
                const userId = user?.id || window.userId;

                if (!userId) {
                    console.error('❌ User ID not found. Unable to create transaction.');
                    return false;
                }
                console.log('✅ User ID retrieved:', userId);

                // Handle full payment transaction creation
                if (projectData.payment_schedule?.type === 'full') {
                    const isPaidNow = projectData.payment_schedule.completed;
                    const wasPaidBefore = existingProject.payment_schedule?.completed || false;

                    console.log(`Debug (Contact Page): isPaidNow = ${isPaidNow}, wasPaidBefore = ${wasPaidBefore}`);

                    if (isPaidNow && !wasPaidBefore) {
                        const newTransaction = {
                            user_id: userId,
                            type: 'income',
                            title: `Payment from ${existingProject.name}`,
                            description: `Project payment for ${existingProject.name}`,
                            amount: projectData.total_amount,
                            date: new Date().toISOString().substring(0, 10),
                        };
                        console.log('Attempting to create new full payment income transaction from contacts page:', newTransaction);
                        const { error: transactionError } = await supabase
                            .from('transactions')
                            .insert([newTransaction]);

                        if (transactionError) {
                            console.error('Error creating new income transaction for full payment:', transactionError);
                            return false;
                        }
                    }
                }

                // Handle staggered payment transaction creation
                if (projectData.payment_schedule?.type === 'staggered' && existingProject.payment_schedule?.type === 'staggered') {
                    const existingMilestones = existingProject.payment_schedule.milestones || [];
                    const updatedMilestones = projectData.payment_schedule.milestones || [];

                    // Using a for...of loop to handle async operations sequentially
                    for (const [index, updatedMilestone] of updatedMilestones.entries()) {
                        const existingMilestone = existingMilestones[index];
                        const isNewlyPaid = updatedMilestone.completed && (!existingMilestone || !existingMilestone.completed);

                        if (isNewlyPaid) {
                            const milestoneAmount = (existingProject.total_amount * (updatedMilestone.percentage / 100));
                            const newTransaction = {
                                user_id: userId,
                                type: 'income',
                                title: `Milestone payment from ${existingProject.name}`,
                                description: `Milestone payment for ${existingProject.name} (Milestone ${index + 1})`,
                                amount: milestoneAmount,
                                date: new Date().toISOString().substring(0, 10),
                            };
                            console.log('Attempting to create new staggered payment income transaction from contacts page:', newTransaction);

                            try {
                                const { error: transactionError } = await supabase.from('transactions').insert([newTransaction]);
                                if (transactionError) {
                                    console.error('Error creating new income transaction for milestone:', transactionError);
                                    return false;
                                }
                            } catch (error) {
                                console.error('Caught an exception during transaction creation:', error);
                                return false;
                            }
                        }
                    }
                }

                // Log the data being sent to the API client for debugging
                console.log('Sending this data to update project:', projectData);

                // Now, proceed with the project update
                result = await apiClient.updateProject(projectId, projectData);
            } else {
                // This part handles creating a new project
                const dataToSave = {
                    ...projectData,
                    contact_id: contact.id,
                    contactName: contact.company_name || contact.contact_person
                };
                result = await apiClient.createProject(dataToSave);
            }

            if (result.success) {
                await component.loadAndRender(); // Refresh the project list on the contact page
                await component.refreshTimeline(); // Refresh the activity timeline
                // NEW: Refresh global calendar data to prevent orphaned references
                console.log('🔄 Refreshing global calendar data after project save...');
                await refreshCalendar(); // Refresh the main dashboard calendar
                if (window.initializeCalendar) {
                    await window.initializeCalendar(); // Refresh global data arrays
                }
                return true; // Tells the modal to close
            } else {
                alert('Failed to save project.');
                return false;
            }
        } catch (error) {
            console.error("Error saving project:", error);
            alert('An error occurred while saving the project.');
            return false;
        }
    });

    return component;
}

// --- Component Class ---
class ContactProjects {
    constructor(contact, container, timelineComponent) {
        this.contact = contact;
        this.contactId = contact.id;
        this.container = container;
        this.timelineComponent = timelineComponent;
        this.projects = [];
    }

    async loadAndRender() {
        try {
            const result = await apiClient.getProjectsByContact(this.contactId);
            if (result.success) {
                this.projects = result.data || [];
                this.render();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Error loading projects:', error);
            this.renderError(error.message);
        }
    }

    render() {
        this.container.innerHTML = '';

        const title = document.createElement('h2');
        title.className = 'text-lg font-bold text-gray-900 px-1';
        title.textContent = 'Projects';
        this.container.appendChild(title);

        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'space-y-4';

        if (this.projects.length > 0) {
            this.projects.forEach(project => {
                cardsContainer.appendChild(this.renderProjectCard(project));
            });
        } else {
            const emptyState = document.createElement('p');
            emptyState.className = 'text-sm text-gray-500 px-1';
            emptyState.textContent = 'No projects for this contact yet.';
            cardsContainer.appendChild(emptyState);
        }
        this.container.appendChild(cardsContainer);
        
        const addProjectButton = this.renderAddProjectButton();
        this.container.appendChild(addProjectButton);
        
        addProjectButton.querySelector('#add-project-btn').addEventListener('click', () => {
            this.addProject();
        });
    }

    renderProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'card p-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer';
        card.dataset.projectId = project.id;

        // Use the new getStatusConfig function to get status display properties
        const statusConfig = getStatusConfig(project.status);

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-gray-800">${project.name || 'Untitled Project'}</h3>
                    <p class="text-sm text-gray-500 mt-1">
                        Due: ${project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'} • 
                        <span class="font-semibold text-gray-700">RM ${project.total_amount ? project.total_amount.toLocaleString() : '0'}</span>
                    </p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.class}">
                    ${statusConfig.label}
                </span>
            </div>
        `;

        card.addEventListener('click', () => {
            this.editProject(project);
        });

        return card;
    }

    renderAddProjectButton() {
        const buttonContainer = document.createElement('div');
        buttonContainer.innerHTML = `
            <button id="add-project-btn" class="w-full mt-4 flex justify-center items-center gap-2 px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span class="font-semibold text-sm">Add New Project</span>
            </button>
        `;
        return buttonContainer;
    }

    renderError(errorMessage) {
        this.container.innerHTML = `<div class="p-4 text-red-600">Error: Could not load projects. ${errorMessage}</div>`;
    }

    addProject() {
        projectFormModal.open(this.contact);
    }

    editProject(project) {
        projectFormModal.openForEdit(project, this.contact);
    }

    async refreshTimeline() {
        if (this.timelineComponent && this.timelineComponent.loadAndRender) {
            console.log('🔄 Refreshing timeline...');
            await this.timelineComponent.loadAndRender();
        }
    }
}