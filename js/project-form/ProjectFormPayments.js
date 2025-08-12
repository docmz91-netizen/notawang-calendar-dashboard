/**
 * js/project-form/ProjectFormPayments.js
 * Handles all payment logic, income creation/removal, and milestone management
 */

import { saveEntry } from '../transactions.js';

export class ProjectFormPayments {
    constructor(modal) {
        this.modal = modal; // Reference to main ProjectFormModal instance
        this.init();
    }

    init() {
        console.log('✅ ProjectFormPayments initialized');
    }

    // === MAIN PAYMENT STATUS HANDLER ===
    
    /**
     * Handles payment status changes and creates/removes income accordingly
     * This is the main entry point for payment processing
     */
    async handlePaymentStatusChanges(newProjectData) {
        console.log('🔍 === INCOME DEBUG SESSION START ===');
        console.log('🔍 Project being saved:', newProjectData.name);
        console.log('🔍 Payment schedule type:', newProjectData.payment_schedule?.type);
        
        try {
            // Get the original project data to compare
            const originalProject = window.allProjects?.find(p => p.id === this.modal.editingProjectId);
            if (!originalProject) {
                console.log('❌ Original project not found, skipping income creation');
                return;
            }

            console.log('🔍 Original project found:', originalProject.name);
            console.log('🔍 Original payment schedule:', originalProject.payment_schedule);

            const newSchedule = newProjectData.payment_schedule;
            const oldSchedule = originalProject.payment_schedule;

            console.log('🔍 Comparing schedules...');
            console.log('    - New schedule type:', newSchedule?.type);
            console.log('    - Old schedule type:', oldSchedule?.type);

            // Route to appropriate payment handler
            if (newSchedule.type === 'staggered' && oldSchedule.type === 'staggered') {
                await this.handleStaggeredPaymentChanges(newProjectData, newSchedule, oldSchedule);
            } else if (newSchedule.type === 'full') {
                await this.handleFullPaymentChanges(newProjectData, newSchedule, oldSchedule);
            } else {
                console.log('⏭️ No payment status changes detected, skipping income creation');
                this.logPaymentConditions(newSchedule, oldSchedule);
            }
            
            console.log('✅ Payment status changes handled. Type:', newSchedule.type);
            
        } catch (error) {
            console.error('❌ Error handling payment status changes:', error);
        }
        
        console.log('🔍 === INCOME DEBUG SESSION END ===');
    }

    // === STAGGERED PAYMENT HANDLING ===
    
    /**
     * Handles changes in staggered payment milestones
     * Creates income for newly paid milestones, removes income for unpaid milestones
     */
    async handleStaggeredPaymentChanges(projectData, newSchedule, oldSchedule) {
        console.log('📊 Processing STAGGERED payment changes...');
        
        let hasChanges = false;
        
        // Process each milestone for changes
        for (let index = 0; index < newSchedule.milestones.length; index++) {
            const newMilestone = newSchedule.milestones[index];
            const oldMilestone = oldSchedule.milestones[index];
            
            console.log(`🔍 Milestone ${index + 1}:`);
            console.log(`    - New completed: ${newMilestone.completed}`);
            console.log(`    - Old completed: ${oldMilestone?.completed}`);
            
            // Check for milestone status changes
            const statusChange = this.analyzeMilestoneStatusChange(newMilestone, oldMilestone);
            
            if (statusChange.type === 'NEWLY_PAID') {
                await this.createMilestoneIncome(projectData, newMilestone, index);
                hasChanges = true;
            } else if (statusChange.type === 'UNPAID') {
                await this.removeMilestoneIncome(projectData.name, index + 1);
                hasChanges = true;
            } else {
                console.log(`    - No change for milestone ${index + 1}`);
            }
        }
        
        if (!hasChanges) {
            console.log('📊 No milestone payment changes detected');
        }
        
        // Note: We deliberately do NOT create a full payment entry for staggered projects
        // even when all milestones are completed, to avoid double-counting
        console.log('📝 Staggered payments: Individual milestone payments only (no full payment entry)');
    }

    // === FULL PAYMENT HANDLING ===
    
    /**
     * Handles changes in full payment status
     * Creates income when full payment is marked as completed
     */
    async handleFullPaymentChanges(projectData, newSchedule, oldSchedule) {
        console.log('📊 Processing FULL payment changes...');
        
        const wasCompleted = oldSchedule?.completed || false;
        const isCompleted = newSchedule.completed || false;
        
        console.log(`    - Was completed: ${wasCompleted}`);
        console.log(`    - Is completed: ${isCompleted}`);
        
        if (isCompleted && !wasCompleted) {
            console.log('💰 Full payment newly marked as completed - creating income');
            await this.createFullPaymentIncome(projectData, newSchedule);
        } else if (!isCompleted && wasCompleted) {
            console.log('🗑️ Full payment unmarked - removing income');
            await this.removeFullPaymentIncome(projectData.name);
        } else {
            console.log('📊 No full payment status change detected');
        }
    }

    // === MILESTONE ANALYSIS ===
    
    /**
     * Analyzes the status change of a milestone
     * Returns the type of change that occurred
     */
    analyzeMilestoneStatusChange(newMilestone, oldMilestone) {
        const newCompleted = newMilestone.completed || false;
        const oldCompleted = oldMilestone?.completed || false;
        
        if (newCompleted && !oldCompleted) {
            return { type: 'NEWLY_PAID', action: 'CREATE_INCOME' };
        } else if (!newCompleted && oldCompleted) {
            return { type: 'UNPAID', action: 'REMOVE_INCOME' };
        } else {
            return { type: 'NO_CHANGE', action: 'NONE' };
        }
    }

    // === INCOME CREATION ===
    
    /**
     * Creates income entry for a newly paid milestone
     */
    async createMilestoneIncome(projectData, milestone, milestoneIndex) {
        try {
            const milestoneAmount = (projectData.total_amount * milestone.percentage) / 100;
            
            const incomeData = {
                date: milestone.due_date || new Date().toISOString().split('T')[0],
                type: 'income',
                title: `Milestone payment from ${projectData.name}`,
                description: `Milestone payment for ${projectData.name} (Milestone ${milestoneIndex + 1})`,
                amount: milestoneAmount
            };
            
            console.log('💰 CREATING MILESTONE INCOME:', incomeData);
            await saveEntry(incomeData);
            console.log('✅ Milestone income created successfully');
            
            return { success: true, amount: milestoneAmount };
        } catch (error) {
            console.error('❌ Error creating milestone income:', error);
            return { success: false, error };
        }
    }

    /**
     * Creates income entry for a full payment
     */
    async createFullPaymentIncome(projectData, paymentSchedule) {
        try {
            const incomeData = {
                date: paymentSchedule.due_date || new Date().toISOString().split('T')[0],
                type: 'income',
                title: `Project Payment: ${projectData.name}`,
                description: `Full payment from ${projectData.contactName}`,
                amount: projectData.total_amount
            };

            console.log('💰 CREATING FULL PAYMENT INCOME:', incomeData);
            await saveEntry(incomeData);
            console.log('✅ Full payment income created successfully');
            
            return { success: true, amount: projectData.total_amount };
        } catch (error) {
            console.error('❌ Error creating full payment income:', error);
            return { success: false, error };
        }
    }

    // === INCOME REMOVAL ===
    
    /**
     * Removes income entry for an unpaid milestone
     */
    async removeMilestoneIncome(projectName, milestoneNumber) {
        try {
            console.log(`🗑️ Searching for income to remove: ${projectName} - Milestone ${milestoneNumber}`);
            
            // Import transaction functions
            const { deleteTransaction, getAllTransactions } = await import('../transactions.js');
            
            // Get all current transactions
            const allTransactions = getAllTransactions();
            
            // Find the income entry that matches this milestone
            const targetTitle = `Milestone payment from ${projectName}`;
            const targetDescription = `Milestone payment for ${projectName} (Milestone ${milestoneNumber})`;
            
            const incomeToRemove = allTransactions.find(transaction => 
                transaction.type === 'income' && 
                (transaction.title === targetTitle || transaction.description === targetDescription)
            );
            
            if (incomeToRemove) {
                console.log('🗑️ Found income to remove:', incomeToRemove);
                const success = await deleteTransaction(incomeToRemove.id);
                if (success) {
                    console.log('✅ Milestone income removed successfully');
                    return { success: true, removedAmount: incomeToRemove.amount };
                } else {
                    console.error('❌ Failed to remove milestone income');
                    return { success: false, error: 'Delete operation failed' };
                }
            } else {
                console.log('⚠️ No matching income entry found to remove');
                return { success: false, error: 'Income entry not found' };
            }
            
        } catch (error) {
            console.error('❌ Error removing milestone income:', error);
            return { success: false, error };
        }
    }

    /**
     * Removes income entry for a full payment
     */
    async removeFullPaymentIncome(projectName) {
        try {
            console.log(`🗑️ Searching for full payment income to remove: ${projectName}`);
            
            // Import transaction functions
            const { deleteTransaction, getAllTransactions } = await import('../transactions.js');
            
            // Get all current transactions
            const allTransactions = getAllTransactions();
            
            // Find the full payment income entry
            const targetTitle = `Project Payment: ${projectName}`;
            
            const incomeToRemove = allTransactions.find(transaction => 
                transaction.type === 'income' && transaction.title === targetTitle
            );
            
            if (incomeToRemove) {
                console.log('🗑️ Found full payment income to remove:', incomeToRemove);
                const success = await deleteTransaction(incomeToRemove.id);
                if (success) {
                    console.log('✅ Full payment income removed successfully');
                    return { success: true, removedAmount: incomeToRemove.amount };
                } else {
                    console.error('❌ Failed to remove full payment income');
                    return { success: false, error: 'Delete operation failed' };
                }
            } else {
                console.log('⚠️ No matching full payment income found to remove');
                return { success: false, error: 'Income entry not found' };
            }
            
        } catch (error) {
            console.error('❌ Error removing full payment income:', error);
            return { success: false, error };
        }
    }

    // === PAYMENT VALIDATION ===
    
    /**
     * Validates payment schedule data before processing
     */
    validatePaymentSchedule(paymentSchedule) {
        const errors = [];
        
        if (!paymentSchedule) {
            errors.push('Payment schedule is missing');
            return { isValid: false, errors };
        }
        
        if (!['full', 'staggered'].includes(paymentSchedule.type)) {
            errors.push('Invalid payment schedule type');
        }
        
        if (paymentSchedule.type === 'staggered') {
            if (!paymentSchedule.milestones || !Array.isArray(paymentSchedule.milestones)) {
                errors.push('Staggered payment must have milestones array');
            } else {
                // Validate milestones
                let totalPercentage = 0;
                paymentSchedule.milestones.forEach((milestone, index) => {
                    if (!milestone.percentage || milestone.percentage <= 0) {
                        errors.push(`Milestone ${index + 1} has invalid percentage`);
                    }
                    totalPercentage += milestone.percentage || 0;
                });
                
                if (Math.abs(totalPercentage - 100) > 0.01) {
                    errors.push(`Total milestone percentage is ${totalPercentage}%, should be 100%`);
                }
            }
        }
        
        return { isValid: errors.length === 0, errors };
    }

    // === PAYMENT CALCULATIONS ===
    
    /**
     * Calculates total paid amount for a project
     */
    calculatePaidAmount(project) {
        if (!project.payment_schedule) return 0;
        
        if (project.payment_schedule.type === 'full') {
            return project.payment_schedule.completed ? project.total_amount : 0;
        } else if (project.payment_schedule.type === 'staggered') {
            let paidAmount = 0;
            project.payment_schedule.milestones?.forEach(milestone => {
                if (milestone.completed) {
                    paidAmount += (project.total_amount * milestone.percentage) / 100;
                }
            });
            return paidAmount;
        }
        
        return 0;
    }

    /**
     * Calculates completion percentage for a project
     */
    calculateCompletionPercentage(project) {
        const totalAmount = project.total_amount || 0;
        if (totalAmount === 0) return 0;
        
        const paidAmount = this.calculatePaidAmount(project);
        return (paidAmount / totalAmount) * 100;
    }

    // === DEBUGGING HELPERS ===
    
    /**
     * Logs payment condition checks for debugging
     */
    logPaymentConditions(newSchedule, oldSchedule) {
        console.log('    Conditions checked:');
        console.log(`    - Is staggered: ${newSchedule?.type === 'staggered' && oldSchedule?.type === 'staggered'}`);
        console.log(`    - Is full payment change: ${newSchedule?.type === 'full' && newSchedule?.completed && !oldSchedule?.completed}`);
        console.log(`    - New schedule:`, newSchedule);
        console.log(`    - Old schedule:`, oldSchedule);
    }

    /**
     * Logs milestone comparison for debugging
     */
    logMilestoneComparison(newMilestones, oldMilestones) {
        console.log('📋 Milestone Comparison:');
        newMilestones?.forEach((newMilestone, index) => {
            const oldMilestone = oldMilestones?.[index];
            console.log(`  Milestone ${index + 1}:`);
            console.log(`    - Percentage: ${newMilestone.percentage}%`);
            console.log(`    - Was completed: ${oldMilestone?.completed || false}`);
            console.log(`    - Now completed: ${newMilestone.completed || false}`);
            console.log(`    - Due date: ${newMilestone.due_date || 'Not set'}`);
        });
    }

    // === UTILITY METHODS ===
    
    /**
     * Formats payment status for display
     */
    formatPaymentStatus(project) {
        const completionPercentage = this.calculateCompletionPercentage(project);
        const paidAmount = this.calculatePaidAmount(project);
        
        return {
            percentage: Math.round(completionPercentage),
            paidAmount: paidAmount,
            totalAmount: project.total_amount || 0,
            isFullyPaid: completionPercentage >= 100,
            isPartiallyPaid: completionPercentage > 0 && completionPercentage < 100,
            isUnpaid: completionPercentage === 0
        };
    }
}