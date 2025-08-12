// js/contacts-manager.js

import { apiClient } from './api-client.js';
import { createContactProjects } from './contact-projects.js';
import { createContactTimeline } from './contact-timeline.js';
import { contactFormPanel } from './contact-form-panel.js'; // NEW: Import the contact form panel

export class ContactsManager {
    constructor() {
        this.currentView = 'list';
        this.currentContactId = null;
        this.contacts = [];
        this.isLoading = false;
        // FIX: The contactFormPanel is now imported and should not be null
        this.contactFormPanel = contactFormPanel;
        this.contactProjectsComponent = null;
        this.contactTimelineComponent = null; // Add a reference for the timeline
        
        console.log('👥 ContactsManager initialized');
    }

    async init() {
        try {
            console.log('🚀 Initializing contacts module...');
            // FIX: Initialize the form panel and connect it here
            this.contactFormPanel.init();
            this.connectFormPanel(this.contactFormPanel);
            
            this.setupEventListeners();
            await this.loadContacts();
            console.log('✅ Contacts module ready');
        } catch (error) {
            console.error('❌ Error initializing contacts:', error);
            this.showError('Failed to initialize contacts module');
        }
    }

    connectFormPanel(formPanel) {
        if (!formPanel) return;
        this.contactFormPanel = formPanel;
        formPanel.setSaveCallback(async (contactData, contactId) => {
            try {
                const transformedData = this.transformPanelDataToContactData(contactData);
                const result = await this.saveContactFromPanel(transformedData, contactId);
                if (result.success) {
                    await this.loadContacts(); // Reload to show changes
                    
                    // FIX: Refresh global data after contact save
                    window.allContacts = (await apiClient.getContacts()).data;
                    window.allProjects = (await apiClient.getProjects()).data;
                    if (typeof window.initializeCalendar === 'function') {
                        await window.initializeCalendar();
                    }
                    console.log('✅ Global data refreshed after contact save');
                    
                    this.showNotification('Contact saved successfully!', 'success');
                    return true;
                } else {
                    this.showError(result.error || 'Failed to save contact');
                    return false;
                }
            } catch (error) {
                this.showError('Failed to save contact');
                return false;
            }
        });
    }

    transformPanelDataToContactData(panelData) {
        return {
            company_name: panelData.companyName || '',
            contact_person: panelData.contactPerson || '',
            email: panelData.emailAddress || '',
            phone: panelData.phoneNumber || ''
        };
    }

    async saveContactFromPanel(contactData, contactId = null) {
        this.setLoading(true);
        try {
            if (contactId) {
                return await apiClient.updateContact(contactId, contactData);
            } else {
                return await apiClient.createContact(contactData);
            }
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            this.setLoading(false);
        }
    }

    setupEventListeners() {
        window.addEventListener('popstate', (event) => {
            if (event.state?.module === 'contacts') {
                this.handleNavigation(event.state);
            }
        });
    }

    handleNavigation(state) {
        if (state.view === 'detail') {
            this.showContactDetail(state.contactId);
        } else {
            this.showContactsList();
        }
    }

    updateUrl(view, contactId = null) {
        const state = { module: 'contacts', view, contactId };
        const url = contactId ? `#contacts/${contactId}` : '#contacts';
        history.pushState(state, '', url);
    }

    // UPDATED: This method now awaits the rendering of the current view
    async loadContacts() {
        this.setLoading(true);
        // We'll call renderCurrentView twice, once to show loading state
        // and a second time after data is loaded and counts are calculated.
        await this.renderCurrentView();
        try {
            const result = await apiClient.getContacts();
            if (result.success) {
                this.contacts = result.data || [];
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showError('Failed to load contacts');
        } finally {
            this.setLoading(false);
            // CHANGED: Now call renderCurrentView async since it uses async renderContactRows
            await this.renderCurrentView();
        }
    }

    async loadContactDetail(contactId) {
        this.setLoading(true);
        this.renderCurrentView();
        try {
            let contact = this.contacts.find(c => c.id == contactId);
            if (!contact) {
                const result = await apiClient.getContact(contactId);
                if (result.success) contact = result.data;
                else throw new Error(result.error);
            }
            if (!contact) throw new Error('Contact not found');
            this.currentContact = contact;
        } catch (error) {
            this.showError('Failed to load contact details');
            this.showContactsList();
        } finally {
            this.setLoading(false);
            this.renderCurrentView();
        }
    }

    showContactsList() {
        this.currentView = 'list';
        this.currentContactId = null;
        this.currentContact = null;
        this.updateUrl('list');
        this.loadContacts();
    }

    showContactDetail(contactId) {
        this.currentView = 'detail';
        this.currentContactId = contactId;
        this.updateUrl('detail', contactId);
        this.loadContactDetail(contactId);
    }

    // UPDATED: This method is now async
    async renderCurrentView() {
        const container = document.getElementById('contacts-page');
        if (!container) return;
        
        let content = '';
        if (this.currentView === 'list') {
            content = await this.renderContactsList();
        } else if (this.currentView === 'detail') {
            content = this.renderContactDetail();
        }
        container.innerHTML = content;

        if (this.currentView === 'list') this.attachListEventListeners();
        if (this.currentView === 'detail') this.attachDetailEventListeners();
    }
    
    // --- THIS IS THE FIX ---
    // UPDATED: This method is now async and fetches project counts dynamically
    async renderContactsList() {
        return `
            <div class="contacts-container">
                <header class="contacts-page-header">
                    <h1>Contacts</h1>
                    <p>Manage your prospects and client relationships</p>
                </header>
                <div class="contacts-toolbar">
                    <div class="contacts-search-container">
                        <div class="search-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" /></svg></div>
                        <input type="text" id="contact-search" placeholder="Search contacts..." autocomplete="off">
                    </div>
                    <button class="btn-primary" id="new-contact-btn"><span>+</span><span>New Contact</span></button>
                </div>
                <div class="contact-list-container" id="contact-list-container">
                    ${this.isLoading ? this.renderLoadingState() : await this.renderContactRows()}
                </div>
            </div>`;
    }

    // --- THIS IS THE FIX ---
    // UPDATED: This method is now async and fetches project counts dynamically
    async renderContactRows() {
        if (this.contacts.length === 0) return this.renderEmptyState();
        
        const header = `<div class="contact-list-header"><div></div><div>Contact</div><div>Project Summary</div><div>Actions</div></div>`;
        
        // NEW: Load project counts for all contacts
        const contactsWithProjectCounts = await Promise.all(
            this.contacts.map(async (contact) => {
                try {
                    const result = await apiClient.getProjectsByContact(contact.id);
                    const projectCount = result.success ? (result.data || []).length : 0;
                    return { ...contact, projectCount };
                } catch (error) {
                    console.error(`Error loading projects for contact ${contact.id}:`, error);
                    return { ...contact, projectCount: 0 };
                }
            })
        );
        
        const rows = contactsWithProjectCounts.map(contact => {
            const displayName = contact.company_name || contact.contact_person || 'N/A';
            const subtitle = contact.company_name && contact.contact_person ? contact.contact_person : (contact.email || '');
            const avatarInitials = displayName.substring(0, 2).toUpperCase();
            
            // NEW: Dynamic project count with proper pluralization
            const projectText = contact.projectCount === 1 ? '1 project' : `${contact.projectCount} projects`;
            
            return `
                <div class="contact-list-row" data-contact-id="${contact.id}">
                    <div class="contact-avatar">${avatarInitials}</div>
                    <div class="contact-info">
                        <a href="#" class="contact-name-link" data-contact-id="${contact.id}">${displayName}</a>
                        <p>${subtitle}</p>
                    </div>
                    <div class="contact-row-projects"><span class="badge">${projectText}</span></div>
                    <div class="contact-row-actions">
                        <button class="btn-icon" title="Edit" data-action="edit" data-contact-id="${contact.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
                        <button class="btn-icon" title="Delete" data-action="delete" data-contact-id="${contact.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button>
                    </div>
                </div>`;
        }).join('');
        
        return header + rows;
    }

    renderContactDetail() {
        if (this.isLoading) return this.renderLoadingState();
        if (!this.currentContact) return `<p class="p-8">Contact not found.</p>`;
        const contact = this.currentContact;
        const displayName = contact.company_name || contact.contact_person || 'Unnamed Contact';
        const avatarInitials = displayName.substring(0, 2).toUpperCase();
        return `
            <div class="p-4 sm:p-6 lg:p-8">
                <div class="max-w-7xl mx-auto">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                        <div>
                            <a href="#" id="back-to-contacts-btn" class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                                Contacts
                            </a>
                            <div class="flex items-center gap-4">
                                <div class="flex-shrink-0 w-12 h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full text-xl font-bold">${avatarInitials}</div>
                                <div>
                                    <h1 class="text-xl font-bold text-gray-900">${displayName}</h1>
                                    <p class="text-gray-600 text-sm">${contact.email || ''}</p>
                                </div>
                            </div>
                        </div>
                        <div class="mt-4 sm:mt-0">
                            <button id="edit-contact-btn" data-contact-id="${contact.id}" class="w-full sm:w-auto flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                                Edit Contact
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div id="contact-projects-container" class="lg:col-span-2 space-y-6"><div class="text-center p-8 text-gray-500">Loading projects...</div></div>
                        <div id="contact-timeline-container" class="lg:col-span-1"><div class="text-center p-8 text-gray-500">Loading timeline...</div></div>
                    </div>
                </div>
            </div>`;
    }

    renderLoadingState() { return `<div class="text-center p-16 text-gray-500">Loading...</div>`; }
    renderEmptyState() { return `<div class="text-center py-16"><div class="text-6xl mb-4">👥</div><h3 class="text-xl font-semibold text-gray-800 mb-2">No contacts yet</h3><p class="text-gray-600 mb-6">Start by adding your first contact.</p><button class="btn-primary" id="add-first-contact-btn"><span>+</span><span>Add First Contact</span></button></div>`; }

    attachListEventListeners() {
        document.getElementById('new-contact-btn')?.addEventListener('click', () => this.handleEditContact());
        document.getElementById('add-first-contact-btn')?.addEventListener('click', () => this.handleEditContact());
        document.querySelectorAll('.contact-name-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const contactId = e.target.closest('[data-contact-id]').getAttribute('data-contact-id');
                this.showContactDetail(contactId);
            });
        });
        document.querySelectorAll('[data-action="edit"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const contactId = e.currentTarget.getAttribute('data-contact-id');
                this.handleEditContact(contactId);
            });
        });
        document.querySelectorAll('[data-action="delete"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const contactId = e.currentTarget.getAttribute('data-contact-id');
                this.confirmDeleteContact(contactId);
            });
        });
    }
    
    async attachDetailEventListeners() {
        document.getElementById('back-to-contacts-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showContactsList();
        });
        document.getElementById('edit-contact-btn')?.addEventListener('click', (e) => {
            const contactId = e.currentTarget.getAttribute('data-contact-id');
            this.handleEditContact(contactId);
        });
        
        await this.initializeContactTimeline();
        await this.initializeContactProjects();
    }

    async initializeContactProjects() {
        if (!this.currentContact) return;
        try {
            const container = document.getElementById('contact-projects-container');
            if (!container) return;
            this.contactProjectsComponent = await createContactProjects(this.currentContact, container, this.contactTimelineComponent);
        } catch (error) {
            console.error('❌ Failed to initialize contact projects component:', error);
        }
    }

    async initializeContactTimeline() {
        if (!this.currentContact?.id) return;
        try {
            const container = document.getElementById('contact-timeline-container');
            if (!container) return;
            this.contactTimelineComponent = await createContactTimeline(this.currentContact.id, container);
        } catch (error) {
            console.error('❌ Failed to initialize contact timeline component:', error);
        }
    }
    
    handleEditContact(contactId = null) {
        if (contactId) {
            const contact = this.contacts.find(c => c.id == contactId);
            if (contact) this.contactFormPanel.openForEdit(contact);
        } else {
            this.contactFormPanel.open();
        }
    }
    
    async deleteContact(contactId) {
        this.setLoading(true);
        try {
            const result = await apiClient.deleteContact(contactId);
            if (result.success) {
                this.showNotification('Contact deleted successfully', 'success');
                await this.loadContacts(); 
            }
        } catch (error) {
            this.showError('Failed to delete contact');
        } finally {
            this.setLoading(false);
        }
    }

    async confirmDeleteContact(contactId) {
        try {
            // First, get all projects for this contact
            const projectsResult = await apiClient.getProjectsByContact(contactId);
            const projects = projectsResult.success ? projectsResult.data : [];
            
            let confirmMessage = 'Are you sure you want to delete this contact?';
            
            if (projects.length > 0) {
                const projectNames = projects.map(p => p.name).slice(0, 5).join('\n• '); // Show max 5 projects
                const moreText = projects.length > 5 ? `\n... and ${projects.length - 5} more` : '';
                confirmMessage = `⚠️ WARNING: This will also delete ${projects.length} project(s):\n\n• ${projectNames}${moreText}\n\nThis action cannot be undone. Are you sure?`;
            }
            
            if (confirm(confirmMessage)) {
                await this.deleteContactWithProjects(contactId, projects);
            }
        } catch (error) {
            console.error('Error checking projects for contact:', error);
            // Fallback to simple confirmation
            if (confirm('Are you sure you want to delete this contact?')) {
                this.deleteContact(contactId);
            }
        }
    }

    async deleteContactWithProjects(contactId, projects) {
        this.setLoading(true);
        try {
            // Delete all projects first (cascade delete)
            for (const project of projects) {
                await apiClient.deleteProject(project.id);
            }
            
            // Then delete the contact
            const result = await apiClient.deleteContact(contactId);
            if (result.success) {
                this.showNotification(`Contact and ${projects.length} project(s) deleted successfully`, 'success');
                await this.loadContacts(); 
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error deleting contact and projects:', error);
            this.showError('Failed to delete contact and projects');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) { this.isLoading = loading; }
    showNotification(message, type = 'info') { console.log(`[${type.toUpperCase()}] ${message}`); }
    showError(message) { this.showNotification(message, 'error'); }
}

export const contactsManager = new ContactsManager();