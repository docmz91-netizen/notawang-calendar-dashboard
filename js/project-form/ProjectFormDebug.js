/**
 * js/project-form/ProjectFormDebug.js
 * Debug utilities and income tracking for development and troubleshooting
 */

export class ProjectFormDebug {
    constructor(modal) {
        this.modal = modal; // Reference to main ProjectFormModal instance
        this.incomeTrackingEnabled = false;
        this.originalSaveEntry = null;
    }

    // === INITIALIZATION ===

    init() {
        console.log('✅ ProjectFormDebug initialized');
    }

    // === INCOME TRACKING DEBUG ===
    
    /**
     * Enables comprehensive income creation tracking
     * Overrides the saveEntry function to log all income creation sources
     */
    enableIncomeTracking() {
        if (this.incomeTrackingEnabled) {
            console.log('⚠️ Income tracking already enabled');
            return;
        }

        console.log('🔍 === ENABLING INCOME TRACKING ===');
        
        // Import and override the saveEntry function
        import('../transactions.js').then(transactionsModule => {
            // Store the original function
            this.originalSaveEntry = transactionsModule.saveEntry;
            
            // Override with tracking version
            transactionsModule.saveEntry = async (entryData, entryId = null) => {
                if (entryData.type === 'income') {
                    console.log('💰 === INCOME CREATION DETECTED ===');
                    console.log('📍 Source: PROJECT FORM MODAL');
                    console.log('💵 Title:', entryData.title);
                    console.log('💵 Amount:', entryData.amount);
                    console.log('💵 Description:', entryData.description);
                    console.log('📅 Date:', entryData.date);
                    console.log('🔗 Entry ID:', entryId || 'NEW');
                    
                    // Enhanced stack trace for better debugging
                    const stack = new Error().stack;
                    const relevantLines = stack.split('\n')
                        .slice(1, 6)
                        .map(line => line.trim())
                        .filter(line => line.includes('.js'));
                    
                    console.log('📍 Call stack (top 5 relevant lines):');
                    relevantLines.forEach((line, index) => {
                        console.log(`  ${index + 1}. ${line}`);
                    });
                    
                    console.log('💰 === END INCOME CREATION LOG ===');
                }
                
                // Call the original function
                return await this.originalSaveEntry(entryData, entryId);
            };
            
            this.incomeTrackingEnabled = true;
            console.log('✅ Income tracking enabled successfully');
        }).catch(error => {
            console.error('❌ Failed to enable income tracking:', error);
        });
    }

    /**
     * Disables income tracking and restores original saveEntry function
     */
    disableIncomeTracking() {
        if (!this.incomeTrackingEnabled || !this.originalSaveEntry) {
            console.log('⚠️ Income tracking not currently enabled');
            return;
        }

        import('../transactions.js').then(transactionsModule => {
            transactionsModule.saveEntry = this.originalSaveEntry;
            this.incomeTrackingEnabled = false;
            this.originalSaveEntry = null;
            console.log('✅ Income tracking disabled');
        });
    }

    /**
     * Legacy method name for backwards compatibility
     */
    debugAllIncomeCreation() {
        console.log('🔄 debugAllIncomeCreation() called - redirecting to enableIncomeTracking()');
        this.enableIncomeTracking();
    }

    // === MILESTONE ROW DEBUGGING ===
    
    /**
     * Debugs milestone rows and their current state
     */
    debugMilestoneRows() {
        console.log('🔍 === DEBUGGING MILESTONE ROWS ===');
        
        const milestoneList = this.modal.modalElement.querySelector('#staggered-payment-details-list');
        console.log('📊 Milestone list exists:', !!milestoneList);
        
        if (!milestoneList) {
            console.log('❌ Milestone list not found in DOM');
            return null;
        }
        
        const rows = milestoneList.querySelectorAll('.milestone-row');
        console.log('📊 Number of milestone rows:', rows.length);
        
        if (rows.length === 0) {
            console.log('⚠️ No milestone rows found');
            return milestoneList;
        }
        
        // Analyze each milestone row
        rows.forEach((row, index) => {
            this.debugSingleMilestoneRow(row, index);
        });
        
        // Calculate totals
        this.debugMilestoneCalculations(rows);
        
        console.log('🔍 === END MILESTONE ROWS DEBUG ===');
        return milestoneList;
    }

    /**
     * Debugs a single milestone row
     */
    debugSingleMilestoneRow(row, index) {
        const percentage = row.querySelector('.milestone-percentage')?.value;
        const completed = row.querySelector('.milestone-completed')?.checked;
        const date = row.querySelector('.milestone-date')?.value;
        
        console.log(`📊 Milestone ${index + 1}:`);
        console.log(`    Percentage: ${percentage}%`);
        console.log(`    Completed: ${completed}`);
        console.log(`    Date: ${date || 'Not set'}`);
        
        // Validate milestone data
        const parsedPercentage = parseFloat(percentage);
        if (isNaN(parsedPercentage) || parsedPercentage <= 0) {
            console.warn(`    ⚠️ Invalid percentage for milestone ${index + 1}`);
        }
        if (parsedPercentage > 100) {
            console.warn(`    ⚠️ Percentage exceeds 100% for milestone ${index + 1}`);
        }
        
        // Check DOM element integrity
        const elements = {
            percentage: !!row.querySelector('.milestone-percentage'),
            completed: !!row.querySelector('.milestone-completed'),
            date: !!row.querySelector('.milestone-date'),
            removeBtn: !!row.querySelector('.remove-milestone-btn')
        };
        
        const missingElements = Object.entries(elements)
            .filter(([key, exists]) => !exists)
            .map(([key]) => key);
            
        if (missingElements.length > 0) {
            console.warn(`    ⚠️ Missing elements: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Debugs milestone calculations and totals
     */
    debugMilestoneCalculations(rows) {
        let totalPercentage = 0;
        let validMilestones = 0;
        let completedMilestones = 0;
        
        rows.forEach((row, index) => {
            const percentage = parseFloat(row.querySelector('.milestone-percentage')?.value || '0');
            const completed = row.querySelector('.milestone-completed')?.checked || false;
            
            if (!isNaN(percentage) && percentage > 0) {
                validMilestones++;
                totalPercentage += percentage;
                
                if (completed) {
                    completedMilestones++;
                }
            }
        });
        
        console.log('📊 Milestone calculations:');
        console.log(`    Valid milestones: ${validMilestones}`);
        console.log(`    Total percentage: ${totalPercentage}%`);
        console.log(`    Completed milestones: ${completedMilestones}`);
        console.log(`    Completion ratio: ${validMilestones > 0 ? (completedMilestones / validMilestones * 100).toFixed(1) : 0}%`);
        
        // Validation warnings
        if (Math.abs(totalPercentage - 100) > 0.01 && validMilestones > 0) {
            if (totalPercentage < 100) {
                console.warn(`    ⚠️ Percentages total ${totalPercentage}%, missing ${100 - totalPercentage}%`);
            } else {
                console.warn(`    ⚠️ Percentages total ${totalPercentage}%, exceeds 100% by ${totalPercentage - 100}%`);
            }
        }
    }

    // === CSS AND STYLING DEBUG ===
    
    /**
     * Checks CSS class definitions for field visibility
     */
    checkFieldHiddenCSS() {
        console.log('🎨 === CHECKING CSS CLASSES ===');
        
        // Test the field-hidden class behavior
        this.testFieldHiddenClass();
        
        // Check for CSS rules in stylesheets
        this.scanStylesheetsForFieldRules();
        
        // Test current field visibility states
        this.debugCurrentFieldVisibility();
        
        console.log('🎨 === END CSS DEBUG ===');
    }

    /**
     * Tests the field-hidden class by creating a test element
     */
    testFieldHiddenClass() {
        console.log('🧪 Testing field-hidden class...');
        
        const testElement = document.createElement('div');
        testElement.className = 'field-hidden';
        testElement.style.position = 'absolute';
        testElement.style.top = '-9999px';
        testElement.textContent = 'Test element';
        
        document.body.appendChild(testElement);
        
        try {
            const computedStyle = window.getComputedStyle(testElement);
            
            console.log('🎨 field-hidden computed styles:');
            console.log(`    display: ${computedStyle.display}`);
            console.log(`    visibility: ${computedStyle.visibility}`);
            console.log(`    opacity: ${computedStyle.opacity}`);
            console.log(`    height: ${computedStyle.height}`);
            console.log(`    overflow: ${computedStyle.overflow}`);
            
            // Determine if the element is effectively hidden
            const isHidden = computedStyle.display === 'none' || 
                           computedStyle.visibility === 'hidden' || 
                           computedStyle.opacity === '0';
            
            console.log(`    Effectively hidden: ${isHidden}`);
            
        } catch (error) {
            console.error('❌ Error testing field-hidden class:', error);
        } finally {
            document.body.removeChild(testElement);
        }
    }

    /**
     * Scans stylesheets for field-related CSS rules
     */
    scanStylesheetsForFieldRules() {
        console.log('🔍 Scanning stylesheets for field rules...');
        
        const stylesheets = Array.from(document.styleSheets);
        let foundRules = 0;
        
        stylesheets.forEach((sheet, index) => {
            try {
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                
                const fieldRules = rules.filter(rule => 
                    rule.selectorText && (
                        rule.selectorText.includes('field-hidden') ||
                        rule.selectorText.includes('field-visible') ||
                        rule.selectorText.includes('hidden') && rule.selectorText.includes('field')
                    )
                );
                
                if (fieldRules.length > 0) {
                    console.log(`📄 Stylesheet ${index} (${sheet.href || 'inline'}):`);
                    fieldRules.forEach(rule => {
                        console.log(`    ${rule.selectorText} { ${rule.style.cssText} }`);
                        foundRules++;
                    });
                }
                
            } catch (error) {
                console.log(`    📄 Stylesheet ${index}: Cannot access (${error.message})`);
            }
        });
        
        if (foundRules === 0) {
            console.log('⚠️ No field-related CSS rules found');
        } else {
            console.log(`✅ Found ${foundRules} field-related CSS rules`);
        }
    }

    /**
     * Debugs current field visibility states
     */
    debugCurrentFieldVisibility() {
        console.log('👁️ Checking current field visibility...');
        
        const fieldsToCheck = [
            { id: 'amount-field-container', name: 'Amount Field' },
            { id: 'target-date-field-container', name: 'Target Date Field' },
            { id: 'payment-schedule-container', name: 'Payment Schedule' },
            { id: 'full-payment-details', name: 'Full Payment Details' },
            { id: 'staggered-payment-details', name: 'Staggered Payment Details' }
        ];
        
        fieldsToCheck.forEach(field => {
            const element = this.modal.modalElement.querySelector(`#${field.id}`);
            
            if (!element) {
                console.log(`    ❌ ${field.name}: Element not found`);
                return;
            }
            
            const computedStyle = window.getComputedStyle(element);
            const isVisible = computedStyle.display !== 'none' && 
                             computedStyle.visibility !== 'hidden' && 
                             computedStyle.opacity !== '0';
            
            console.log(`    ${isVisible ? '✅' : '❌'} ${field.name}: ${isVisible ? 'Visible' : 'Hidden'}`);
            console.log(`        Classes: ${element.className}`);
            console.log(`        Display: ${computedStyle.display}`);
            
            if (element.classList.contains('field-hidden')) {
                console.log(`        Has field-hidden class: Yes`);
            }
        });
    }

    // === GENERAL DEBUG UTILITIES ===
    
    /**
     * Logs comprehensive modal state for debugging
     */
    debugModalState() {
        console.log('🔍 === MODAL STATE DEBUG ===');
        
        console.log('📋 Modal properties:');
        console.log(`    Editing project ID: ${this.modal.editingProjectId}`);
        console.log(`    Contact ID: ${this.modal.contactId}`);
        console.log(`    Contact Name: ${this.modal.contactName}`);
        console.log(`    Is initialized: ${this.modal.isInitialized}`);
        
        const currentStatus = this.modal.modalElement.querySelector('#initialStatus')?.value;
        console.log(`    Current status: ${currentStatus}`);
        
        const paymentType = this.modal.modalElement.querySelector('input[name="paymentType"]:checked')?.value;
        console.log(`    Payment type: ${paymentType}`);
        
        // Debug form data
        console.log('📝 Current form data:');
        try {
            const formData = this.modal.getFormData();
            console.log(formData);
        } catch (error) {
            console.error('❌ Error getting form data:', error);
        }
        
        console.log('🔍 === END MODAL STATE DEBUG ===');
    }

    /**
     * Comprehensive debug session for troubleshooting
     */
    runFullDebugSession() {
        console.log('🚀 === FULL DEBUG SESSION START ===');
        
        this.debugModalState();
        this.checkFieldHiddenCSS();
        this.debugMilestoneRows();
        
        // Enable income tracking for this session
        this.enableIncomeTracking();
        
        console.log('🚀 === FULL DEBUG SESSION COMPLETE ===');
        console.log('💡 Income tracking is now enabled for this session');
    }

    /**
     * Quick debug summary for common issues
     */
    quickDebug() {
        console.log('⚡ === QUICK DEBUG SUMMARY ===');
        
        const status = this.modal.modalElement.querySelector('#initialStatus')?.value;
        const paymentType = this.modal.modalElement.querySelector('input[name="paymentType"]:checked')?.value;
        
        console.log(`Status: ${status}, Payment: ${paymentType}`);
        
        // Check critical elements
        const criticalElements = [
            'amount-field-container',
            'payment-schedule-container',
            'staggered-payment-details-list'
        ];
        
        criticalElements.forEach(id => {
            const element = this.modal.modalElement.querySelector(`#${id}`);
            const exists = !!element;
            const visible = exists ? window.getComputedStyle(element).display !== 'none' : false;
            console.log(`${id}: ${exists ? '✅' : '❌'} exists, ${visible ? '👁️' : '🙈'} visible`);
        });
        
        console.log('⚡ === END QUICK DEBUG ===');
    }
}