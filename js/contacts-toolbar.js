/**
 * contacts-toolbar.js - Contacts Page Management
 * This file is now simplified and acts as an entry point to initialize the main contacts manager.
 */

import { contactsManager } from './contacts-manager.js';
import { contactFormPanel } from './contact-form-panel.js';

/**
 * Initialize the entire contacts page module.
 * This function will be called once when the contacts page is activated.
 */
export async function initializeContactsPage() {
    console.log('🚀 Initializing Contacts Page Module...');
    
    try {
        // Ensure the contact form panel is initialized
        if (contactFormPanel && !contactFormPanel.isInitialized) {
            contactFormPanel.init();
        }

        // Initialize the main contacts manager. It will handle its own rendering and event listeners.
        if (contactsManager) {
            // Connect the form panel to the manager so they can communicate.
            contactsManager.connectFormPanel(contactFormPanel);
            
            // The init method will load data and render the initial view.
            await contactsManager.init();
        } else {
            console.error('❌ FATAL: contactsManager module not found.');
        }
        
        console.log('✅ Contacts Page Module initialized successfully.');

    } catch (error) {
        console.error('❌ Failed to initialize the Contacts Page Module:', error);
    }
}
