/**
 * js/project-form/ProjectFormEvents.js
 * Handles all event binding, user interactions, and form events
 */

export class ProjectFormEvents {
    constructor(modal) {
        this.modal = modal; // Reference to main ProjectFormModal instance
    }

    // === INITIALIZATION ===
    init() {
        this.bindEventListeners();
        this.bindKeyboardEvents();
        this.bindValidationEvents();
        console.log('✅ ProjectFormEvents initialized with all event listeners');
    }

    // === MAIN EVENT BINDING ===
    
    bindEventListeners() {
        this.bindModalEvents();
        this.bindFormEvents();
        this.bindStatusEvents();
        this.bindPaymentEvents();
        this.bindFieldChangeEvents();
        this.bindButtonEvents();
    }

    // === MODAL CONTROL EVENTS ===
    
    bindModalEvents() {
        // Close button events
        this.modal.modalElement.querySelector('#project-modal-close-btn')?.addEventListener('click', () => {
            this.modal.close();
        });

        // Overlay click to close
        this.modal.overlayElement?.addEventListener('click', () => {
            this.modal.close();
        });

        // Cancel button
        this.modal.modalElement.querySelector('#project-modal-cancel-btn')?.addEventListener('click', () => {
            this.modal.close();
        });
    }

    // === FORM SUBMISSION EVENTS ===
    
    bindFormEvents() {
        // Main form submission
        this.modal.modalElement.querySelector('#project-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
    }

    async handleFormSubmit() {
        console.log('📝 Form submitted - delegating to save method');
        await this.modal.save();
    }

    // === STATUS SELECTION EVENTS ===
    
    bindStatusEvents() {
        // Status button clicks
        this.modal.modalElement.querySelector('#projectStatusButtons')?.addEventListener('click', (e) => {
            this.handleStatusButtonClick(e);
        });
    }

    handleStatusButtonClick(event) {
        const status = event.target.dataset.status;
        
        if (status && this.modal.manualStatuses.includes(status)) {
            console.log('🎯 Status button clicked:', status);
            
            // Update the hidden status field
            this.modal.modalElement.querySelector('#initialStatus').value = status;
            
            // Update UI to reflect the new status
            this.modal.renderer.updateFormFields();
            this.modal.renderer.toggleStatusButtons(status);
            
            console.log('✅ Status updated to:', status);
        }
    }

    // === PAYMENT TYPE EVENTS ===
    
    bindPaymentEvents() {
        // Payment type radio button changes
        this.modal.modalElement.querySelectorAll('input[name="paymentType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handlePaymentTypeChange(e);
            });
        });
    }

    handlePaymentTypeChange(event) {
        const paymentType = event.target.value;
        console.log('💳 Payment type changed to:', paymentType);
        
        // Update payment details visibility
        this.modal.renderer.updatePaymentDetails();
        
        // Recalculate project status based on new payment type
        this.modal.renderer.autoUpdateProjectStatus();
    }

    // === FIELD CHANGE EVENTS ===
    
    bindFieldChangeEvents() {
        // Payment completion and milestone changes
        this.modal.modalElement.addEventListener('change', (e) => {
            this.handleFieldChange(e);
        });
    }

    handleFieldChange(event) {
        const target = event.target;
        
        // Check if the changed field affects project status
        if (target.matches('.milestone-completed, #full-payment-completed, .milestone-percentage, #total_amount')) {
            console.log('💰 Payment-related field changed:', target.className || target.id);
            
            // Auto-update project status based on payment completion
            this.modal.renderer.autoUpdateProjectStatus();
            
            // Update payment progress display
            this.modal.renderer.updatePaymentProgressDisplay();
        }
    }

    // === BUTTON EVENTS ===
    
    bindButtonEvents() {
        this.bindTaskButtonEvents();
        this.bindMilestoneButtonEvents();
    }

    // === TASK MANAGEMENT EVENTS ===
    
    bindTaskButtonEvents() {
        // Add task button
        this.modal.modalElement.querySelector('#add-task-btn')?.addEventListener('click', () => {
            this.handleAddTask();
        });
    }

    handleAddTask() {
        console.log('➕ Adding new task row');
        this.modal.renderer.addTaskRow();
        
        // Focus on the new task description field
        const taskList = this.modal.modalElement.querySelector('#task-list');
        const newTaskRow = taskList?.lastElementChild;
        const descriptionField = newTaskRow?.querySelector('.task-description');
        if (descriptionField) {
            setTimeout(() => descriptionField.focus(), 100);
        }
    }

    // === MILESTONE MANAGEMENT EVENTS ===
    
    bindMilestoneButtonEvents() {
        // Add milestone button
        this.modal.modalElement.querySelector('#add-milestone-btn')?.addEventListener('click', () => {
            this.handleAddMilestone();
        });
    }

    handleAddMilestone() {
        console.log('➕ Adding new milestone row');
        this.modal.renderer.addMilestoneRow();
        
        // Trigger UI update when a new milestone is added
        this.modal.renderer.autoUpdateProjectStatus();
        
        // Focus on the new milestone percentage field
        const milestoneList = this.modal.modalElement.querySelector('#staggered-payment-details-list');
        const newMilestoneRow = milestoneList?.lastElementChild;
        const percentageField = newMilestoneRow?.querySelector('.milestone-percentage');
        if (percentageField) {
            setTimeout(() => percentageField.focus(), 100);
        }
    }

    // === KEYBOARD EVENTS ===
    
    bindKeyboardEvents() {
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    handleKeyboardShortcuts(event) {
        // Only handle keyboard events when modal is open
        if (this.modal.modalElement?.classList.contains('hidden')) {
            return;
        }

        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.modal.close();
                console.log('⌨️ Modal closed with ESC key');
                break;
                
            case 'Enter':
                // Only submit if not in a textarea or if Ctrl+Enter is pressed
                if (event.ctrlKey || (!event.target.matches('textarea'))) {
                    const form = this.modal.modalElement.querySelector('#project-form');
                    if (form && event.target.closest('#project-form')) {
                        event.preventDefault();
                        this.handleFormSubmit();
                        console.log('⌨️ Form submitted with keyboard shortcut');
                    }
                }
                break;
        }
    }

    // === VALIDATION EVENTS ===
    
    bindValidationEvents() {
        // Real-time validation on key input
        this.modal.modalElement.addEventListener('input', (e) => {
            this.handleInputValidation(e);
        });

        // Validation on field blur
        this.modal.modalElement.addEventListener('blur', (e) => {
            this.handleFieldBlur(e);
        }, true); // Use capture phase
    }

    handleInputValidation(event) {
        const target = event.target;
        
        // Validate percentage fields
        if (target.matches('.milestone-percentage')) {
            this.validatePercentageField(target);
        }
        
        // Validate amount fields
        if (target.matches('#total_amount')) {
            this.validateAmountField(target);
        }
        
        // Validate required fields
        if (target.matches('[required]')) {
            this.validateRequiredField(target);
        }
    }

    validatePercentageField(field) {
        const value = parseFloat(field.value);
        
        // Remove any existing error styling
        field.classList.remove('border-red-500', 'border-green-500');
        
        if (isNaN(value) || value < 0 || value > 100) {
            field.classList.add('border-red-500');
            field.title = 'Please enter a percentage between 0 and 100';
        } else {
            field.classList.add('border-green-500');
            field.title = '';
        }
    }

    validateAmountField(field) {
        const value = parseFloat(field.value);
        
        // Remove any existing error styling
        field.classList.remove('border-red-500', 'border-green-500');
        
        if (isNaN(value) || value <= 0) {
            field.classList.add('border-red-500');
            field.title = 'Please enter a valid amount greater than 0';
        } else {
            field.classList.add('border-green-500');
            field.title = '';
        }
    }

    validateRequiredField(field) {
        // Remove any existing error styling
        field.classList.remove('border-red-500', 'border-green-500');
        
        if (!field.value.trim()) {
            field.classList.add('border-red-500');
            field.title = 'This field is required';
        } else {
            field.classList.add('border-green-500');
            field.title = '';
        }
    }

    handleFieldBlur(event) {
        const target = event.target;
        
        // Perform more thorough validation on blur
        if (target.matches('.milestone-percentage, #total_amount, [required]')) {
            this.handleInputValidation(event);
        }
    }

    // === EVENT UTILITIES ===
    
    // Clean up event listeners (useful for testing or modal destruction)
    destroy() {
        // Remove any global event listeners if needed
        // This would be called when the modal is permanently destroyed
        console.log('🧹 ProjectFormEvents cleaned up');
    }

    // === DEBUG HELPERS ===
    
    logEventInfo(eventType, target, data = {}) {
        console.log(`🎯 Event: ${eventType}`, {
            target: target.tagName + (target.className ? `.${target.className.split(' ').join('.')}` : ''),
            id: target.id || 'no-id',
            value: target.value || 'no-value',
            ...data
        });
    }
}