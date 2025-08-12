/**
 * js/project-form-modal.js
 * Main orchestrator for the project form modal system
 * Coordinates all sub-modules and provides backwards compatible API
 */

import { setupTransactions, refetchTransactionData, getProjectData, saveEntry } from './transactions.js';
import { supabase } from './supabase-client.js';
import { CONFIG } from './config.js';
import { ProjectFormRenderer } from './project-form/ProjectFormRenderer.js';
import { ProjectFormEvents } from './project-form/ProjectFormEvents.js';
import { ProjectFormPayments } from './project-form/ProjectFormPayments.js';
import { ProjectFormData } from './project-form/ProjectFormData.js';
import { ProjectFormDebug } from './project-form/ProjectFormDebug.js';

class ProjectFormModal {
    constructor() {
        this.isInitialized = false;
        this.onSaveCallback = null;
        this.editingProjectId = null;
        this.contactId = null;
        this.contactName = '';
        this.modalElement = null;
        this.overlayElement = null;
        this.panelElement = null;
        
        // Status configuration
        this.manualStatuses = ['inquiry', 'quotation', 'invoice'];
        this.autoStatuses = ['partially_paid', 'completed'];
        this.projectStatuses = [...this.manualStatuses, ...this.autoStatuses];
        
        // Initialize sub-modules
        this.renderer = new ProjectFormRenderer(this);
        this.events = new ProjectFormEvents(this);
        this.payments = new ProjectFormPayments(this);
        this.data = new ProjectFormData(this);
        this.debug = new ProjectFormDebug(this);
    }

    // === INITIALIZATION ===
    
    init() {
        if (this.isInitialized) return;
        console.log('🚀 Initializing project form modal...');

        this.modalElement = document.getElementById('projectFormModal');
        if (!this.modalElement) {
            console.error('❌ Project form modal element not found in HTML.');
            return;
        }

        this.overlayElement = this.modalElement.querySelector('#project-modal-overlay');
        this.panelElement = this.modalElement.querySelector('#projectSidebar');

        // Initialize sub-modules
        this.renderer.init();
        this.events.init();
        this.payments.init();
        this.data.init();
        this.debug.init();
        
        this.isInitialized = true;
        console.log('✅ Project form modal initialized.');
    }

    // === MODAL CONTROL ===
    
    open(contact) {
        this.contactId = contact.id;
        this.contactName = contact.company_name || contact.contact_person || 'Selected Contact';
        this.editingProjectId = null;
        this.renderer.updateUI('Add New Project', 'Save Project');
        this.renderer.clearForm();
        this.renderer.hideDeleteButton();
        this.show();
    }

    openForEdit(project, contact) {
        this.contactId = contact.id;
        this.contactName = contact.company_name || contact.contact_person || 'Selected Contact';
        this.editingProjectId = project.id;
        this.renderer.updateUI('Edit Project', 'Update Project');
        
        this.renderer.populateForm(project);
        this.renderer.addDeleteButton();
        this.show();
        
        // Ensure status is set correctly after showing
        setTimeout(() => {
            const statusField = this.modalElement.querySelector('#initialStatus');
            if (statusField && project.status) {
                statusField.value = project.status;
                this.renderer.toggleStatusButtons(project.status);
                this.renderer.updateFormFields();
                console.log('✅ Final status confirmation:', project.status);
            }
        }, 50);
    }

    show() {
        if (!this.modalElement) return;

        const contactNameEl = this.modalElement.querySelector('#project-modal-contact-name');
        if (contactNameEl) {
            contactNameEl.textContent = `For contact: ${this.contactName}`;
        }

        this.modalElement.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        
        setTimeout(() => {
            if (this.overlayElement) this.overlayElement.style.opacity = '1';
            if (this.panelElement) this.panelElement.style.transform = 'translateX(0)';
            
            this.renderer.updateFormFields();
            this.renderer.updatePaymentDetails();
            this.renderer.updatePaymentProgressDisplay();
        }, 10);
    }

    close() {
        if (!this.modalElement) return;

        if (this.overlayElement) this.overlayElement.style.opacity = '0';
        if (this.panelElement) this.panelElement.style.transform = 'translateX(100%)';
        document.body.classList.remove('overflow-hidden');

        setTimeout(() => {
            this.modalElement.classList.add('hidden');
        }, 300);
    }

    // === MAIN ACTIONS ===
    
    async save() {
        console.log('🔍 === PROJECT SAVE DEBUG START ===');
        
        // Enable income tracking for debugging
        this.debug.enableIncomeTracking();
        
        const projectData = this.getFormData();
        console.log('🔍 DEBUG - Project data being saved:', projectData);
        
        if (!projectData.name) {
            console.error('Project Name is required.');
            return;
        }

        // Handle payment status changes if editing
        if (this.editingProjectId && projectData.payment_schedule) {
            console.log('🔍 Calling handlePaymentStatusChanges...');
            await this.payments.handlePaymentStatusChanges(projectData, this.editingProjectId);
        }

        if (this.onSaveCallback) {
            console.log('🔍 Calling onSaveCallback...');
            const success = await this.onSaveCallback(projectData, this.editingProjectId);
            if (success) {
                this.close();
                console.log('🔍 Calling refetchTransactionData...');
                await refetchTransactionData();
            }
        }
        
        console.log('🔍 === PROJECT SAVE DEBUG END ===');
    }

    async deleteProject() {
        if (!this.editingProjectId) return;
        console.log('User confirmed deletion of project.');
        
        try {
            const { apiClient } = await import('./api-client.js');
            const result = await apiClient.deleteProject(this.editingProjectId);
            if (result.success) {
                this.close();
                await refetchTransactionData();
                if (this.onSaveCallback) await this.onSaveCallback(null, this.editingProjectId);
            } else {
                console.error('Failed to delete project:', result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('❌ Error deleting project:', error);
        }
    }

    // === MAIN DATA COLLECTION ===
    
    /**
     * Gets form data - delegates to ProjectFormData module
     */
    getFormData() {
        return this.data.getFormData();
    }

    // === CALLBACK MANAGEMENT ===
    
    setSaveCallback(callback) {
        this.onSaveCallback = callback;
    }

    // === DEBUG METHODS ===
    
    /**
     * Enable comprehensive income tracking for debugging
     */
    debugAllIncomeCreation() {
        return this.debug.enableIncomeTracking();
    }
    
    /**
     * Debug milestone rows and their state
     */
    debugMilestoneRows() {
        return this.debug.debugMilestoneRows();
    }
    
    /**
     * Check CSS field visibility rules
     */
    checkFieldHiddenCSS() {
        return this.debug.checkFieldHiddenCSS();
    }
    
    /**
     * Run comprehensive debug session
     */
    runFullDebugSession() {
        return this.debug.runFullDebugSession();
    }
}

// Export the class and instance for backwards compatibility
export { ProjectFormModal };
export const projectFormModal = new ProjectFormModal();

// Export the helper function for opening project modals
export async function openProjectModalForProject(project) {
    console.log('🪟 Opening project modal for editing:', project.name);
    
    try {
        // Ensure we have the project form modal available
        if (!projectFormModal) {
            console.error('❌ ProjectFormModal not available');
            return;
        }
        
        // Create a mock contact object with the project's contact info
        const mockContact = {
            id: project.contact_id || 'unknown',
            company_name: project.client_name || 'Selected Contact',
            contact_person: project.client_name || 'Selected Contact'
        };
        
        console.log('✅ Using mock contact:', mockContact);
        console.log('✅ Project data:', project);
        
        // Use the proper class method to open for editing
        projectFormModal.openForEdit(project, mockContact);
        
        console.log('✅ Project modal opened with auto-populated data');
        
    } catch (error) {
        console.error('❌ Error setting up project modal:', error);
    }
}