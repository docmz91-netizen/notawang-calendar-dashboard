/**
 * main.js - Application Entry Point
 * Initializes all application modules and coordinates startup
 */

import { initializeSidebar } from './navigation.js';
import { initializeContactsPage } from './contacts-toolbar.js';
import { initializeCalendar } from './calendar.js';
import { setupTransactions } from './transactions.js';
import { initializeModals } from './modals.js';
// REMOVED: Direct import of projectFormModal - will be handled dynamically
import { initializeMonthlyGoal } from './monthly-goal.js';

console.log('🚀 NotaWang App is starting...');

/**
 * Initialize the complete application
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting Cashflow Calendar...');
    
    try {
        // 1. Initialize navigation system
        await initializeSidebar();
        
        // 2. Initialize contacts page components (This is handled by navigation.js now)
        
        // 3. Initialize calendar system
        await initializeCalendar();
        
        // 4. Initialize transaction system
        await setupTransactions();
        
        // 5. Initialize general modal system
        initializeModals();

        // 6. REMOVED: Direct projectFormModal.init() - handled in dynamic import below

        // 7. Initialize monthly goal functionality
        await initializeMonthlyGoal();
        
        console.log('🎉 App initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showInitializationError(error);
    }
});

/**
 * Show initialization error to user
 * @param {Error} error - The initialization error
 */
function showInitializationError(error) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'initialization-error';
    errorContainer.innerHTML = `
        <div style="position: fixed; top: 1rem; right: 1rem; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; max-width: 400px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h3 style="color: #dc2626; margin: 0 0 0.5rem 0; font-weight: 600;">Initialization Error</h3>
            <p style="color: #7f1d1d; margin: 0;">The application failed to start. Please refresh the page.</p>
        </div>
    `;
    document.body.appendChild(errorContainer);
}

// FIXED: Correct dynamic import initialization
window.addEventListener('DOMContentLoaded', () => {
    // FIXED: Removed extra './js/' from path
    import('./project-form-modal.js').then(module => {
        window.projectFormModal = module.projectFormModal;
        window.ProjectFormModal = module.ProjectFormModal; // ADDED LINE
        window.openProjectModalForProject = module.openProjectModalForProject;
        if (window.projectFormModal && typeof window.projectFormModal.init === 'function') {
            window.projectFormModal.init();
            console.log('✅ ProjectFormModal initialized successfully');
            
            // PERMANENT FIX: Set up save callback automatically
            window.projectFormModal.setSaveCallback(async (projectData, editingProjectId) => {
                console.log('🔧 Auto-initialized save callback triggered');
                try {
                    const { apiClient } = await import('./api-client.js');
                    
                    let result;
                    if (editingProjectId) {
                        result = await apiClient.updateProject(editingProjectId, projectData);
                        console.log('✅ Project updated:', result);
                    } else {
                        result = await apiClient.createProject(projectData);
                        console.log('✅ Project created:', result);
                    }
                    
                    if (result && result.success) {
                        const { refetchTransactionData } = await import('./transactions.js');
                        await refetchTransactionData();
                        console.log('✅ Data refreshed after save');
                        return true;
                    } else {
                        console.error('❌ Save failed:', result?.error);
                        return false;
                    }
                } catch (error) {
                    console.error('❌ Save error:', error);
                    return false;
                }
            });
            console.log('✅ Project save callback initialized automatically');
        }
    }).catch(error => {
        console.error('❌ Failed to initialize projectFormModal:', error);
    });

    // Make refetchTransactionData globally available
    import('./transactions.js').then(module => {
        window.refetchTransactionData = module.refetchTransactionData;
    });

    // Make apiClient globally available
    import('./api-client.js').then(module => {
        window.apiClient = module.apiClient;
    });

    // Make calendar functions globally available
    import('./js/calendar.js').then(module => {
        window.renderCalendar = module.renderCalendar;
        window.getCurrentCalendarDate = module.getCurrentCalendarDate;
        window.refreshCalendar = module.refreshCalendar;
        console.log('✅ Calendar functions made globally available');
    });
});