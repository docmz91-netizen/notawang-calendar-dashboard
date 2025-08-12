// js/sidebar-nav.js

import { contactsManager } from './contacts-manager.js';

export function initializeSidebar() {
    console.log('🚀 Initializing sidebar...');
    
    // Get all the elements we need
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navItems = document.querySelectorAll('.nav-item');
    
    // Check if we have the basic elements
    if (!sidebar || !mainContent || !sidebarToggle) {
        console.error('Sidebar elements not found. Please check your HTML.');
        return;
    }
    
    // Load saved sidebar state (collapsed or not)
    let isCollapsed = loadSidebarState();
    
    // Apply the initial state
    updateSidebarUI();
    
    // Add click event to toggle button
    sidebarToggle.addEventListener('click', function() {
        toggleSidebar();
    });
    
    // Add click events to navigation items
    navItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            handleNavigation(this);
        });
    });
    
    // Handle window resize for mobile
    window.addEventListener('resize', function() {
        handleResize();
    });
    
    console.log('✅ Sidebar initialized successfully');
    
    // Functions for sidebar functionality
    function toggleSidebar() {
        isCollapsed = !isCollapsed;
        updateSidebarUI();
        saveSidebarState();
    }
    
    function updateSidebarUI() {
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
        }
    }
    
    function handleNavigation(clickedItem) {
        navItems.forEach(function(item) {
            item.classList.remove('active');
        });
        clickedItem.classList.add('active');
        const pageName = clickedItem.getAttribute('data-page');
        showPage(pageName);
        console.log('📄 Navigated to:', pageName);
    }
    
    function showPage(pageName) {
        // Hide all static pages first
        const allPages = document.querySelectorAll('.page-content');
        allPages.forEach(function(page) {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(pageName + '-page');
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // If it's the contacts page, initialize it after making it visible
        if (pageName === 'contacts') {
            contactsManager.init(); 
        }
    }
    
    function handleResize() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) { console.log('📱 Mobile view'); } 
        else { console.log('🖥️ Desktop view'); }
    }
    
    function saveSidebarState() {
        try { localStorage.setItem('sidebar-collapsed', isCollapsed); } 
        catch (error) { console.warn('Could not save sidebar state'); }
    }
    
    function loadSidebarState() {
        try { return localStorage.getItem('sidebar-collapsed') === 'true'; } 
        catch (error) { console.warn('Could not load sidebar state'); return false; }
    }
}