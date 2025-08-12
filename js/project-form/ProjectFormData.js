/**
 * js/project-form/ProjectFormData.js
 * Handles form data collection, validation, transformation, and processing
 */

export class ProjectFormData {
    constructor(modal) {
        this.modal = modal; // Reference to main ProjectFormModal instance
    }

    // === INITIALIZATION ===

    init() {
        console.log('✅ ProjectFormData initialized');
    }

    // === MAIN DATA COLLECTION ===
    
    /**
     * Collects and processes all form data into a structured project object
     * This is the main entry point for data collection
     */
    getFormData() {
        const form = document.getElementById('project-form');
        if (!form) {
            console.error('❌ Project form not found');
            return null;
        }

        console.log('📝 Collecting form data...');

        // Build base project data structure
        const projectData = this.buildBaseProjectData(form);
        
        // Add conditional fields based on status
        this.addConditionalFields(projectData, form);
        
        // Process tasks and milestones
        this.addTasksData(projectData, form);
        this.addPaymentScheduleData(projectData, form);
        
        // Validate the collected data
        const validation = this.validateProjectData(projectData);
        if (!validation.isValid) {
            console.warn('⚠️ Form validation issues:', validation.errors);
            // Note: We still return the data to allow partial saves or user correction
        }

        console.log('✅ Form data collected:', projectData);
        return projectData;
    }

    // === BASE DATA STRUCTURE ===
    
    /**
     * Builds the base project data structure with core fields
     */
    buildBaseProjectData(form) {
        const data = {
            name: this.getFieldValue(form, 'projectName'),
            description: this.getFieldValue(form, 'projectDescription'),
            status: this.modal.modalElement.querySelector('#initialStatus')?.value || 'inquiry',
            contactName: this.modal.contactName,
            contact_id: this.modal.contactId,
            total_amount: null,
            start_date: null,
            payment_schedule: null,
            tasks: []
        };

        console.log('🏗️ Base project data built:', {
            name: data.name,
            status: data.status,
            contactName: data.contactName
        });

        return data;
    }

    // === CONDITIONAL FIELDS ===
    
    /**
     * Adds fields that are only relevant for certain project statuses
     */
    addConditionalFields(projectData, form) {
        const status = projectData.status;
        
        // Add total amount for quotation and later stages
        if (['quotation', 'invoice', 'partially_paid', 'completed'].includes(status)) {
            const amountValue = this.getFieldValue(form, 'total_amount');
            projectData.total_amount = this.parseAmount(amountValue);
            console.log('💰 Added total amount:', projectData.total_amount);
        }
        
        // Add target date for quotations
        if (status === 'quotation') {
            projectData.start_date = this.getFieldValue(form, 'target_date');
            console.log('📅 Added start date:', projectData.start_date);
        }
    }

    // === TASKS DATA PROCESSING ===
    
    /**
     * Collects and processes task data from the form
     */
    addTasksData(projectData, form) {
        const taskRows = form.querySelectorAll('.task-row');
        const tasks = [];
        
        taskRows.forEach((row, index) => {
            const task = this.extractTaskFromRow(row, index);
            if (task && task.description.trim()) {
                tasks.push(task);
            }
        });
        
        projectData.tasks = tasks;
        console.log(`📋 Added ${tasks.length} tasks`);
        
        return tasks;
    }

    /**
     * Extracts task data from a single task row
     */
    extractTaskFromRow(row, index) {
        try {
            const description = row.querySelector('.task-description')?.value?.trim();
            const dueDate = row.querySelector('.task-date')?.value;
            const completed = row.querySelector('.task-completed')?.checked || false;
            
            if (!description) {
                console.log(`⏭️ Skipping empty task row ${index + 1}`);
                return null;
            }
            
            const task = {
                description,
                due_date: dueDate || null,
                completed
            };
            
            console.log(`📝 Task ${index + 1}:`, task);
            return task;
        } catch (error) {
            console.error(`❌ Error extracting task from row ${index + 1}:`, error);
            return null;
        }
    }

    // === PAYMENT SCHEDULE PROCESSING ===
    
    /**
     * Collects and processes payment schedule data
     */
    addPaymentScheduleData(projectData, form) {
        const status = projectData.status;
        
        // Only add payment schedule for invoice and later stages
        if (!['invoice', 'partially_paid', 'completed'].includes(status)) {
            console.log('⏭️ Payment schedule not applicable for status:', status);
            return;
        }
        
        const paymentType = this.getPaymentType(form);
        
        if (paymentType === 'full') {
            projectData.payment_schedule = this.buildFullPaymentSchedule(form);
        } else if (paymentType === 'staggered') {
            projectData.payment_schedule = this.buildStaggeredPaymentSchedule(form);
        }
        
        console.log('💳 Payment schedule added:', projectData.payment_schedule);
    }

    /**
     * Gets the selected payment type from the form
     */
    getPaymentType(form) {
        const paymentTypeElement = form.elements.paymentType;
        if (!paymentTypeElement) {
            console.warn('⚠️ Payment type element not found, defaulting to full');
            return 'full';
        }
        
        const paymentType = paymentTypeElement.value || 'full';
        console.log('💳 Payment type:', paymentType);
        return paymentType;
    }

    /**
     * Builds full payment schedule data
     */
    buildFullPaymentSchedule(form) {
        const scheduleDate = this.getFieldValue(form, 'full_payment_date');
        const isPaid = form.querySelector('#full-payment-completed')?.checked || false;
        
        const schedule = {
            type: 'full',
            due_date: scheduleDate || null,
            completed: isPaid
        };
        
        console.log('💰 Full payment schedule:', schedule);
        return schedule;
    }

    /**
     * Builds staggered payment schedule data
     */
    buildStaggeredPaymentSchedule(form) {
        const milestoneRows = form.querySelectorAll('.milestone-row');
        const milestones = [];
        
        milestoneRows.forEach((row, index) => {
            const milestone = this.extractMilestoneFromRow(row, index);
            if (milestone && milestone.percentage > 0) {
                milestones.push(milestone);
            }
        });
        
        const schedule = {
            type: 'staggered',
            milestones: milestones
        };
        
        console.log(`📊 Staggered payment schedule with ${milestones.length} milestones:`, schedule);
        return schedule;
    }

    /**
     * Extracts milestone data from a single milestone row
     */
    extractMilestoneFromRow(row, index) {
        try {
            const percentageValue = row.querySelector('.milestone-percentage')?.value;
            const dueDate = row.querySelector('.milestone-date')?.value;
            const completed = row.querySelector('.milestone-completed')?.checked || false;
            
            const percentage = this.parsePercentage(percentageValue);
            
            if (isNaN(percentage) || percentage <= 0) {
                console.log(`⏭️ Skipping milestone ${index + 1} with invalid percentage:`, percentageValue);
                return null;
            }
            
            const milestone = {
                percentage,
                due_date: dueDate || null,
                completed
            };
            
            console.log(`📊 Milestone ${index + 1}:`, milestone);
            return milestone;
        } catch (error) {
            console.error(`❌ Error extracting milestone from row ${index + 1}:`, error);
            return null;
        }
    }

    // === DATA VALIDATION ===
    
    /**
     * Validates the collected project data
     */
    validateProjectData(projectData) {
        const errors = [];
        const warnings = [];
        
        // Required field validation
        if (!projectData.name?.trim()) {
            errors.push('Project name is required');
        }
        
        if (!projectData.contactName?.trim()) {
            errors.push('Contact name is required');
        }
        
        // Amount validation for applicable statuses
        if (['quotation', 'invoice', 'partially_paid', 'completed'].includes(projectData.status)) {
            if (!projectData.total_amount || projectData.total_amount <= 0) {
                errors.push('Total amount must be greater than 0');
            }
        }
        
        // Payment schedule validation
        if (projectData.payment_schedule) {
            const paymentValidation = this.validatePaymentSchedule(projectData.payment_schedule);
            errors.push(...paymentValidation.errors);
            warnings.push(...paymentValidation.warnings);
        }
        
        // Task validation
        const taskValidation = this.validateTasks(projectData.tasks);
        warnings.push(...taskValidation.warnings);
        
        const result = {
            isValid: errors.length === 0,
            errors,
            warnings
        };
        
        if (errors.length > 0) {
            console.warn('❌ Validation errors:', errors);
        }
        
        if (warnings.length > 0) {
            console.warn('⚠️ Validation warnings:', warnings);
        }
        
        return result;
    }

    /**
     * Validates payment schedule data
     */
    validatePaymentSchedule(paymentSchedule) {
        const errors = [];
        const warnings = [];
        
        if (!paymentSchedule.type || !['full', 'staggered'].includes(paymentSchedule.type)) {
            errors.push('Invalid payment schedule type');
            return { errors, warnings };
        }
        
        if (paymentSchedule.type === 'staggered') {
            if (!paymentSchedule.milestones || paymentSchedule.milestones.length === 0) {
                errors.push('Staggered payment must have at least one milestone');
                return { errors, warnings };
            }
            
            // Validate milestone percentages
            let totalPercentage = 0;
            paymentSchedule.milestones.forEach((milestone, index) => {
                if (!milestone.percentage || milestone.percentage <= 0) {
                    errors.push(`Milestone ${index + 1} has invalid percentage`);
                }
                if (milestone.percentage > 100) {
                    errors.push(`Milestone ${index + 1} percentage cannot exceed 100%`);
                }
                totalPercentage += milestone.percentage || 0;
            });
            
            // Check total percentage
            if (Math.abs(totalPercentage - 100) > 0.01) {
                if (totalPercentage < 100) {
                    warnings.push(`Milestone percentages total ${totalPercentage}%, consider adding more milestones`);
                } else {
                    errors.push(`Milestone percentages total ${totalPercentage}%, must equal 100%`);
                }
            }
        }
        
        return { errors, warnings };
    }

    /**
     * Validates task data
     */
    validateTasks(tasks) {
        const warnings = [];
        
        tasks.forEach((task, index) => {
            if (!task.due_date) {
                warnings.push(`Task ${index + 1} has no due date`);
            }
            
            if (task.description.length > 200) {
                warnings.push(`Task ${index + 1} description is very long (${task.description.length} characters)`);
            }
        });
        
        return { warnings };
    }

    // === UTILITY METHODS ===
    
    /**
     * Safely gets a field value from the form
     */
    getFieldValue(form, fieldName) {
        try {
            const element = form.elements[fieldName] || form.querySelector(`[name="${fieldName}"]`);
            return element?.value?.trim() || '';
        } catch (error) {
            console.warn(`⚠️ Error getting field value for ${fieldName}:`, error);
            return '';
        }
    }

    /**
     * Parses amount value to float
     */
    parseAmount(value) {
        if (!value) return null;
        
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Parses percentage value to float
     */
    parsePercentage(value) {
        if (!value) return 0;
        
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
    }

    /**
     * Formats project data for API submission
     */
    formatForAPI(projectData) {
        // Create a clean copy for API submission
        const apiData = { ...projectData };
        
        // Ensure required fields have appropriate defaults
        if (!apiData.description) apiData.description = '';
        if (!apiData.tasks) apiData.tasks = [];
        
        // Convert dates to proper format if needed
        if (apiData.start_date && !this.isValidDate(apiData.start_date)) {
            console.warn('⚠️ Invalid start date format:', apiData.start_date);
            apiData.start_date = null;
        }
        
        // Clean up payment schedule dates
        if (apiData.payment_schedule) {
            if (apiData.payment_schedule.type === 'full' && apiData.payment_schedule.due_date) {
                if (!this.isValidDate(apiData.payment_schedule.due_date)) {
                    console.warn('⚠️ Invalid payment due date:', apiData.payment_schedule.due_date);
                    apiData.payment_schedule.due_date = null;
                }
            } else if (apiData.payment_schedule.type === 'staggered') {
                apiData.payment_schedule.milestones.forEach((milestone, index) => {
                    if (milestone.due_date && !this.isValidDate(milestone.due_date)) {
                        console.warn(`⚠️ Invalid milestone ${index + 1} due date:`, milestone.due_date);
                        milestone.due_date = null;
                    }
                });
            }
        }
        
        console.log('📤 Data formatted for API:', apiData);
        return apiData;
    }

    /**
     * Validates if a string is a valid date
     */
    isValidDate(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    // === DEBUG HELPERS ===
    
    /**
     * Logs detailed form state for debugging
     */
    debugFormState() {
        const form = document.getElementById('project-form');
        if (!form) return;
        
        console.log('🔍 === FORM DEBUG STATE ===');
        console.log('📝 Form elements:', form.elements.length);
        
        // Log all form field values
        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`);
        }
        
        // Log task rows
        const taskRows = form.querySelectorAll('.task-row');
        console.log(`📋 Task rows: ${taskRows.length}`);
        
        // Log milestone rows
        const milestoneRows = form.querySelectorAll('.milestone-row');
        console.log(`📊 Milestone rows: ${milestoneRows.length}`);
        
        console.log('🔍 === END FORM DEBUG ===');
    }
}