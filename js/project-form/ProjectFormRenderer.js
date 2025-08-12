/**
 * js/project-form/ProjectFormRenderer.js
 * Handles all UI rendering, DOM manipulation, and visual updates
 */

export class ProjectFormRenderer {
    constructor(modal) {
        this.modal = modal; // Reference to main ProjectFormModal instance
    }

    // === INITIALIZATION ===
    
    init() {
        this.renderStatusButtons();
        console.log('✅ ProjectFormRenderer initialized');
    }

    // === STATUS BUTTONS RENDERING ===
    
    renderStatusButtons() {
        const container = this.modal.modalElement.querySelector('#projectStatusButtons');
        if (!container) return;
        container.innerHTML = '';
        
        this.modal.projectStatuses.forEach(status => {
            const button = document.createElement('button');
            button.type = 'button';
            
            const isAutoStatus = this.modal.autoStatuses.includes(status);
            
            button.className = `status-btn px-4 py-2 text-sm font-medium rounded-md border transition-colors duration-200 capitalize ${
                isAutoStatus 
                    ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100 cursor-pointer'
            }`;
            
            const displayText = status === 'partially_paid' ? 'Partially Paid' : status;
            button.textContent = displayText;
            button.dataset.status = status;
            
            if (isAutoStatus) {
                button.disabled = true;
                button.title = 'This status is automatically calculated based on payment completion';
            }
            
            container.appendChild(button);
        });
    }

    toggleStatusButtons(activeStatus) {
        this.modal.modalElement.querySelectorAll('.status-btn').forEach(btn => {
            if (btn.dataset.status === activeStatus) {
                btn.classList.add('bg-indigo-600', 'text-white', 'hover:bg-indigo-700', 'border-indigo-600');
                btn.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-100', 'border-gray-300');
            } else if (!this.modal.autoStatuses.includes(btn.dataset.status)) {
                btn.classList.remove('bg-indigo-600', 'text-white', 'hover:bg-indigo-700', 'border-indigo-600');
                btn.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-100', 'border-gray-300');
            }
        });
    }

    // === FIELD VISIBILITY MANAGEMENT ===
    
    toggleFieldVisibility(element, isVisible) {
        if (!element) return;
        
        if (isVisible) {
            element.classList.remove('field-hidden');
            element.style.display = '';
        } else {
            element.classList.add('field-hidden');
            element.style.display = '';
        }
    }

    updateFormFields() {
        const status = this.modal.modalElement.querySelector('#initialStatus')?.value;
        console.log('🔧 updateFormFields called with status:', status);
        
        const amountContainer = this.modal.modalElement.querySelector('#amount-field-container');
        const targetDateContainer = this.modal.modalElement.querySelector('#target-date-field-container');
        const paymentContainer = this.modal.modalElement.querySelector('#payment-schedule-container');
        
        if (amountContainer) {
            const shouldShowAmount = ['quotation', 'invoice', 'partially_paid', 'completed'].includes(status);
            this.toggleFieldVisibility(amountContainer, shouldShowAmount);
            console.log('  - Amount container visible:', shouldShowAmount);
        }
        
        if (targetDateContainer) {
            const shouldShowTarget = status === 'quotation';
            this.toggleFieldVisibility(targetDateContainer, shouldShowTarget);
            console.log('  - Target date container visible:', shouldShowTarget);
        }
        
        if (paymentContainer) {
            const shouldShowPayment = ['invoice', 'partially_paid', 'completed'].includes(status);
            this.toggleFieldVisibility(paymentContainer, shouldShowPayment);
            console.log('  - Payment container visible:', shouldShowPayment);
        } else {
            console.log('  - ❌ Payment container not found in DOM!');
        }
    }

    updatePaymentDetails() {
        const paymentType = this.modal.modalElement.querySelector('input[name="paymentType"]:checked')?.value;
        console.log('🔧 updatePaymentDetails called with type:', paymentType);
        
        const fullDetails = this.modal.modalElement.querySelector('#full-payment-details');
        const staggeredDetails = this.modal.modalElement.querySelector('#staggered-payment-details');
        
        if (fullDetails) {
            const shouldShowFull = paymentType === 'full';
            this.toggleFieldVisibility(fullDetails, shouldShowFull);
            console.log('  - Full payment details visible:', shouldShowFull);
        } else {
            console.log('  - ❌ Full payment details not found!');
        }
        
        if (staggeredDetails) {
            const shouldShowStaggered = paymentType === 'staggered';
            this.toggleFieldVisibility(staggeredDetails, shouldShowStaggered);
            console.log('  - Staggered payment details visible:', shouldShowStaggered);
        } else {
            console.log('  - ❌ Staggered payment details not found!');
        }
        
        // Trigger auto-update of status when payment type changes
        this.autoUpdateProjectStatus();
    }

    // === FORM MANAGEMENT ===
    
    updateUI(title, saveButtonText) {
        this.modal.modalElement.querySelector('#project-modal-title').textContent = title;
        this.modal.modalElement.querySelector('#project-modal-save-btn').textContent = saveButtonText;
    }

    clearForm() {
        const form = this.modal.modalElement.querySelector('#project-form');
        if (!form) return;
        
        form.reset();
        this.modal.modalElement.querySelector('#task-list').innerHTML = '';
        this.modal.modalElement.querySelector('#staggered-payment-details-list').innerHTML = '';
        this.addTaskRow();
        
        const initialStatus = 'inquiry';
        this.modal.modalElement.querySelector('#initialStatus').value = initialStatus;
        this.toggleStatusButtons(initialStatus);
        
        // Reset radio buttons and details
        const fullRadio = form.querySelector('input[name="paymentType"][value="full"]');
        if (fullRadio) fullRadio.checked = true;
        
        this.updateFormFields();
        this.updatePaymentDetails();
        this.updatePaymentProgressDisplay();
    }

    populateForm(project) {
        const form = document.getElementById('project-form');
        if (!form) return;

        // Populate basic fields
        const nameField = form.querySelector('[name="projectName"]');
        const descField = form.querySelector('[name="projectDescription"]');
        if (nameField) nameField.value = project.name || '';
        if (descField) descField.value = project.description || '';
        
        // Set project status
        const projectStatus = project.status || 'inquiry';
        this.modal.modalElement.querySelector('#initialStatus').value = projectStatus;
        this.toggleStatusButtons(projectStatus);
        
        // Populate amount and date fields
        if (form.elements.total_amount) {
            form.elements.total_amount.value = project.total_amount || '';
        }
        
        const quoteDate = project.start_date;
        if (quoteDate && form.elements.target_date) {
            form.elements.target_date.value = quoteDate;
        }
        
        // Populate tasks
        if (project.tasks && Array.isArray(project.tasks)) {
            const taskList = document.getElementById('task-list');
            if (taskList) {
                taskList.innerHTML = '';
                project.tasks.forEach(task => {
                    this.addTaskRow(task);
                });
                if (project.tasks.length === 0) {
                    this.addTaskRow();
                }
            }
        }
        
        // Populate payment schedule
        const paymentSchedule = project.payment_schedule;
        if (paymentSchedule) {
            if (paymentSchedule.type === 'staggered') {
                const staggeredRadio = form.querySelector('input[name="paymentType"][value="staggered"]');
                if (staggeredRadio) {
                    staggeredRadio.checked = true;
                    const milestoneList = document.getElementById('staggered-payment-details-list');
                    if (milestoneList) {
                        milestoneList.innerHTML = '';
                        paymentSchedule.milestones.forEach(milestone => {
                            this.addMilestoneRow(milestone);
                        });
                    }
                }
            } else {
                const fullRadio = form.querySelector('input[name="paymentType"][value="full"]');
                if (fullRadio) fullRadio.checked = true;
                if (form.elements.full_payment_date) form.elements.full_payment_date.value = paymentSchedule.due_date || '';
                const isPaidCheckbox = form.querySelector('#full-payment-completed');
                if (isPaidCheckbox) isPaidCheckbox.checked = paymentSchedule.completed || false;
            }
        } else {
            const fullRadio = form.querySelector('input[name="paymentType"][value="full"]');
            if (fullRadio) fullRadio.checked = true;
        }
        
        this.updateFormFields();
        this.updatePaymentDetails();
        this.autoUpdateProjectStatus();
    }

    // === DYNAMIC ROWS ===
    
    addTaskRow(task = {}) {
        const taskList = this.modal.modalElement.querySelector('#task-list');
        const taskRow = document.createElement('div');
        taskRow.className = 'flex items-center gap-2 task-row';
        taskRow.innerHTML = `
            <input type="checkbox" class="task-completed h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" ${task.completed ? 'checked' : ''}>
            <input type="text" placeholder="Task description..." class="task-description flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm" value="${task.description || ''}">
            <input type="date" class="task-date px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm" value="${task.due_date || ''}">
            <button type="button" class="remove-task-btn p-2 text-gray-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        `;
        taskList.appendChild(taskRow);
        taskRow.querySelector('.remove-task-btn').addEventListener('click', (e) => e.currentTarget.closest('.task-row').remove());
    }

    addMilestoneRow(milestone = {}) {
        const milestoneList = this.modal.modalElement.querySelector('#staggered-payment-details-list');
        const milestoneRow = document.createElement('div');
        milestoneRow.className = 'flex items-center gap-2 milestone-row';
        milestoneRow.innerHTML = `
            <input type="checkbox" class="milestone-completed h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" ${milestone.completed ? 'checked' : ''}>
            <input type="number" placeholder="%" class="milestone-percentage w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm" value="${milestone.percentage || ''}">
            <input type="date" class="milestone-date flex-grow px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm" value="${milestone.due_date || ''}">
            <button type="button" class="remove-milestone-btn p-2 text-gray-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        `;
        milestoneList.appendChild(milestoneRow);
        milestoneRow.querySelector('.remove-milestone-btn').addEventListener('click', (e) => {
            e.currentTarget.closest('.milestone-row').remove();
            this.autoUpdateProjectStatus();
        });
    }

    // === PROJECT STATUS CALCULATION ===
    
    autoUpdateProjectStatus() {
        const currentStatus = this.modal.modalElement.querySelector('#initialStatus')?.value;

        // Only auto-update if current status is 'invoice' or already auto-calculated
        if (!['invoice', 'partially_paid', 'completed'].includes(currentStatus)) {
            return;
        }

        const paymentType = this.modal.modalElement.querySelector('input[name="paymentType"]:checked')?.value;
        let newStatus = 'invoice'; // Default

        if (paymentType === 'full') {
            const isPaid = this.modal.modalElement.querySelector('#full-payment-completed')?.checked || false;
            newStatus = isPaid ? 'completed' : 'invoice';
        } else if (paymentType === 'staggered') {
            const milestoneRows = this.modal.modalElement.querySelectorAll('.milestone-row');
            let totalMilestones = 0;
            let completedMilestones = 0;

            milestoneRows.forEach(row => {
                const percentage = parseFloat(row.querySelector('.milestone-percentage').value);
                if (!isNaN(percentage) && percentage > 0) {
                    totalMilestones++;
                    if (row.querySelector('.milestone-completed').checked) {
                        completedMilestones++;
                    }
                }
            });

            if (totalMilestones === 0 || completedMilestones === 0) {
                newStatus = 'invoice';
            } else if (completedMilestones === totalMilestones) {
                newStatus = 'completed';
            } else {
                newStatus = 'partially_paid';
            }
        }

        // Update the status and UI
        this.modal.modalElement.querySelector('#initialStatus').value = newStatus;
        this.toggleStatusButtons(newStatus);
        this.updatePaymentProgressDisplay();
    }

    updatePaymentProgressDisplay() {
        const paymentType = this.modal.modalElement.querySelector('input[name="paymentType"]:checked')?.value;
        const currentStatus = this.modal.modalElement.querySelector('#initialStatus')?.value;

        let progressEl = this.modal.modalElement.querySelector('#payment-progress-display');
        if (!progressEl) {
            progressEl = document.createElement('div');
            progressEl.id = 'payment-progress-display';
            progressEl.className = 'mt-2 text-sm text-gray-600';
            const statusContainer = this.modal.modalElement.querySelector('#projectStatusButtons');
            if (statusContainer && statusContainer.parentNode) {
                statusContainer.parentNode.insertBefore(progressEl, statusContainer.nextSibling);
            }
        }

        let progressText = '';

        if (['invoice', 'partially_paid', 'completed'].includes(currentStatus)) {
            if (paymentType === 'full') {
                const isPaid = this.modal.modalElement.querySelector('#full-payment-completed')?.checked || false;
                progressText = isPaid ? '✅ Payment completed' : '⏳ Payment pending';
            } else if (paymentType === 'staggered') {
                const milestoneRows = this.modal.modalElement.querySelectorAll('.milestone-row');
                let totalMilestones = 0;
                let completedMilestones = 0;

                milestoneRows.forEach(row => {
                    const percentage = parseFloat(row.querySelector('.milestone-percentage')?.value || '0');
                    if (!isNaN(percentage) && percentage > 0) {
                        totalMilestones++;
                        if (row.querySelector('.milestone-completed')?.checked) {
                            completedMilestones++;
                        }
                    }
                });

                if (totalMilestones > 0) {
                    progressText = `💰 ${completedMilestones}/${totalMilestones} milestones completed`;
                }
            }
        }

        progressEl.textContent = progressText;
        progressEl.style.display = progressText ? 'block' : 'none';
    }

    // === DELETE BUTTON MANAGEMENT ===
    
    addDeleteButton() {
        const modal = document.getElementById('projectFormModal');
        if (!modal) return;
        let deleteBtn = modal.querySelector('#project-modal-delete-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-flex';
            return;
        }
        deleteBtn = document.createElement('button');
        deleteBtn.id = 'project-modal-delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.className = 'inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700';
        deleteBtn.innerHTML = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete Project`;
        deleteBtn.addEventListener('click', () => this.modal.deleteProject());
        const saveBtn = modal.querySelector('#project-modal-save-btn');
        saveBtn?.parentElement.insertBefore(deleteBtn, saveBtn);
    }

    hideDeleteButton() {
        const deleteBtn = document.getElementById('project-modal-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
    }
}