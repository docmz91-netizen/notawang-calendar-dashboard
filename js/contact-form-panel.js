// js/contact-form-panel.js
// This module manages the slide-out contact form panel for both creating and editing contacts.

export class ContactFormPanel {
    constructor() {
        this.isInitialized = false;
        this.onSaveCallback = null;
        this.editingContactId = null; // To store the ID of the contact being edited
        // FIX: Added direct references to HTML elements to ensure they're found
        this.modalElement = document.getElementById('contactFormModal');
        this.sidebarElement = document.getElementById('contactSidebar');
        this.overlayElement = document.getElementById('sidebarOverlay');
        this.formElement = document.getElementById('newContactForm');
    }

    init() {
        if (this.isInitialized) return;
        console.log('🚀 Initializing contact form panel...');
        try {
            this.bindInternalEventListeners();
            this.setupKeyboardShortcuts();
            this.isInitialized = true;
            console.log('✅ Contact form panel initialized successfully.');
        } catch (error) {
            console.error('❌ Failed to initialize contact form panel:', error);
        }
    }

    bindInternalEventListeners() {
        this.overlayElement?.addEventListener('click', (e) => {
            if (e.target === this.overlayElement) this.close();
        });

        this.formElement?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });
        
        // FIX: Listen for the close and cancel buttons
        this.modalElement.querySelector('#contact-modal-close-btn')?.addEventListener('click', () => this.close());
        this.modalElement.querySelector('#cancel-contact-btn')?.addEventListener('click', () => this.close());
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (this.isOpen()) {
                if (event.key === 'Escape') this.close();
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    this.save();
                }
            }
        });
    }

    /**
     * Opens the panel for creating a new contact.
     */
    open() {
        this.editingContactId = null; // Ensure we are in "create" mode
        this.updatePanelUI('New Contact', 'Save Contact');
        this.clearForm();
        this.showPanel();
    }

    /**
     * Opens the panel for editing an existing contact.
     * @param {object} contact - The contact object to edit.
     */
    openForEdit(contact) {
        this.editingContactId = contact.id;
        this.updatePanelUI('Edit Contact', 'Update Contact');
        this.populateForm(contact);
        this.showPanel();
    }

    showPanel() {
        if (!this.modalElement) return;

        // FIX: Use the 'hidden' class on the main modal container
        this.modalElement.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        // FIX: Implement the slide-in animation logic using CSS properties
        setTimeout(() => {
            if (this.overlayElement) this.overlayElement.style.opacity = '1';
            if (this.sidebarElement) this.sidebarElement.style.transform = 'translateX(0)';
        }, 10);

        setTimeout(() => this.sidebarElement.querySelector('input, textarea')?.focus(), 300);
    }

    close() {
        if (!this.modalElement) return;

        // FIX: Implement the slide-out animation logic using CSS properties
        if (this.overlayElement) this.overlayElement.style.opacity = '0';
        if (this.sidebarElement) this.sidebarElement.style.transform = 'translateX(100%)';
        document.body.classList.remove('overflow-hidden');

        setTimeout(() => {
            this.modalElement.classList.add('hidden');
        }, 300);
    }
    
    /**
     * Updates the panel's title and save button text.
     * @param {string} title - The new title for the panel.
     * @param {string} buttonText - The new text for the save button.
     */
    updatePanelUI(title, buttonText) {
        // FIX: Update the selectors to match the new HTML
        const titleElement = document.querySelector('#contactSidebar h2');
        const saveButton = document.querySelector('#save-contact-btn');
        if (titleElement) titleElement.textContent = title;
        if (saveButton) saveButton.textContent = buttonText;
    }
    
    /**
     * Fills the form with data from an existing contact object.
     * @param {object} contact - The contact data.
     */
    populateForm(contact) {
        const form = this.formElement;
        if (!form) return;
        form.elements.companyName.value = contact.company_name || '';
        form.elements.contactPerson.value = contact.contact_person || '';
        form.elements.emailAddress.value = contact.email || '';
        form.elements.phoneNumber.value = contact.phone || '';
    }

    isOpen() {
        return !this.modalElement?.classList.contains('hidden');
    }

    clearForm() {
        this.formElement?.reset();
    }

    getFormData() {
        const form = this.formElement;
        if (!form) return null;
        const formData = new FormData(form);
        return {
            companyName: formData.get('companyName')?.trim() || '',
            contactPerson: formData.get('contactPerson')?.trim() || '',
            emailAddress: formData.get('emailAddress')?.trim() || '',
            phoneNumber: formData.get('phoneNumber')?.trim() || ''
        };
    }

    validateForm(data) {
        if (!data.companyName && !data.contactPerson) {
            alert('Please enter either a company name or a contact person.');
            return false;
        }
        return true;
    }

    async save() {
        const contactData = this.getFormData();
        if (!contactData || !this.validateForm(contactData)) return;

        if (this.onSaveCallback) {
            // Pass back the data AND the ID (which will be null if creating a new contact)
            const wasSuccessful = await this.onSaveCallback(contactData, this.editingContactId);
            if (wasSuccessful) {
                console.log('🔄 Contact saved successfully, refreshing all data...');
                await this.refreshAllGlobalData();
                this.close();
            }
        } else {
            console.error('❌ Save callback not registered.');
        }
    }

    setSaveCallback(callback) {
        if (typeof callback === 'function') {
            this.onSaveCallback = callback;
        } else {
            console.error('❌ Save callback must be a function.');
        }
    }

    async refreshAllGlobalData() {
        try {
            console.log('🔄 Refreshing all data after contact save...');
            const { apiClient } = await import('./api-client.js');
            window.allContacts = await apiClient.getContacts();
            window.allProjects = await apiClient.getProjects();
            if (typeof window.initializeCalendar === 'function') {
                await window.initializeCalendar();
            }
            console.log('✅ Data refresh complete');
        } catch (error) {
            console.error('❌ Error refreshing data:', error);
        }
    }
}

export const contactFormPanel = new ContactFormPanel();

window.openContactSidebar = () => contactFormPanel.open();
window.closeContactSidebar = () => contactFormPanel.close();