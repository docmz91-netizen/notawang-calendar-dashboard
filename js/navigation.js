/**
 * navigation.js - Main Navigation System
 * Handles page switching and ensures modules are initialized correctly.
 */

import { initializeContactsPage } from './contacts-toolbar.js';

// --- State Management ---
// This object keeps track of which pages have been initialized.
const pageInitializationState = {
    dashboard: true, // Assume dashboard is always ready
    projects: false,
    contacts: false
};

/**
 * Initialize sidebar navigation system.
 */
export async function initializeSidebar() {
    console.log('🚀 Initializing sidebar navigation...');
    
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.page-content');
    
    if (navItems.length === 0 || pages.length === 0) {
        console.error('❌ Critical navigation elements not found. Halting initialization.');
        return;
    }

    // Add click handlers to all navigation items.
    navItems.forEach(navItem => {
        navItem.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = navItem.getAttribute('data-page');
            switchToPage(targetPage, navItems, pages);
        });
    });

    // Set the initial page to the dashboard.
    console.log('🏠 Setting dashboard as the default startup page.');
    switchToPage('dashboard', navItems, pages);
    
    console.log('✅ Sidebar navigation initialized successfully.');
}

/**
 * Switch to a specific page and handle its initialization.
 * @param {string} targetPage - The page to switch to (e.g., 'dashboard', 'contacts').
 * @param {NodeList} navItems - All navigation items.
 * @param {NodeList} pages - All page elements.
 */
async function switchToPage(targetPage, navItems, pages) {
    console.log(`📄 Attempting to switch to page: ${targetPage}`);
    
    // --- 1. Update UI (Active Classes) ---
    navItems.forEach(item => item.classList.remove('active'));
    pages.forEach(page => page.classList.remove('active'));

    const targetNavItem = document.querySelector(`.nav-item[data-page="${targetPage}"]`);
    if (targetNavItem) {
        targetNavItem.classList.add('active');
    }

    const targetPageElement = document.getElementById(`${targetPage}-page`);
    if (targetPageElement) {
        targetPageElement.classList.add('active');
    }

    // --- 2. Handle Page-Specific Logic and Initialization ---
    // This ensures a module is only initialized the first time it's viewed.
    if (!pageInitializationState[targetPage]) {
        console.log(`✨ Initializing module for '${targetPage}' for the first time.`);
        
        try {
            if (targetPage === 'contacts') {
                await initializeContactsPage();
            }
            // Add other pages here if they need specific initialization
            // else if (targetPage === 'projects') {
            //     await initializeProjectsPage();
            // }
            
            // Mark the page as initialized to prevent re-initialization.
            pageInitializationState[targetPage] = true;
            console.log(`✅ Module for '${targetPage}' has been initialized.`);

        } catch (error) {
            console.error(`❌ Failed to initialize module for '${targetPage}':`, error);
            // Optionally, show an error message to the user on the page.
        }
    } else {
        console.log(`👍 Module for '${targetPage}' already initialized. No action needed.`);
    }
}

/**
 * Programmatically switch to a page (for external use).
 * @param {string} pageName - Name of the page to switch to.
 */
export function navigateToPage(pageName) {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.page-content');
    switchToPage(pageName, navItems, pages);
}

/**
 * Get the current active page.
 * @returns {string|null} - Name of the current active page or null.
 */
export function getCurrentPage() {
    const activePage = document.querySelector('.page-content.active');
    return activePage ? activePage.id.replace('-page', '') : null;
}
