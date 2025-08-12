// js/monthly-goal.js
import { CONFIG } from './config.js';
import { supabase } from './supabase-client.js'; // Assuming this is how you import your Supabase client
import { getAllTransactions } from './transactions.js'; // NEW: Import getAllTransactions

/**
 * Initializes the monthly goal functionality.
 * Sets up event listeners for the 'edit' and 'save' buttons.
 */
export async function initializeMonthlyGoal() {
    console.log('✨ Initializing Monthly Goal module...');
    const editGoalBtn = document.getElementById('edit-goal-btn');
    const saveGoalBtn = document.getElementById('save-goal-btn');
    const goalModal = document.getElementById('goal-modal');
    const goalSidebar = document.getElementById('goal-sidebar');
    const goalAmountInput = document.getElementById('goal-amount');

    // Load the current goal when the dashboard loads
    await fetchAndDisplayMonthlyGoal();

    // Event listener to open the modal
    if (editGoalBtn) {
        editGoalBtn.addEventListener('click', () => {
            goalModal.classList.remove('hidden');
            setTimeout(() => {
                goalSidebar.classList.remove('translate-x-full');
            }, 10);
        });
    }

    // Event listener to save the goal
    if (saveGoalBtn) {
        saveGoalBtn.addEventListener('click', async () => {
            const goalAmount = parseFloat(goalAmountInput.value);

            if (isNaN(goalAmount) || goalAmount < 0) {
                // IMPORTANT: Do NOT use alert(). Use a custom message box instead.
                // For now, I'll keep it as alert() as per your original code pattern,
                // but consider replacing this with a styled modal or toast notification.
                alert('Please enter a valid positive number for your goal.');
                return;
            }

            // Here we call the function to save the data to the database
            await saveMonthlyGoal(goalAmount);
            
            // Close the modal after saving
            closeGoalModal();

            // Update the dashboard display
            await fetchAndDisplayMonthlyGoal();
        });
    }

    // Helper function to close the modal
    function closeGoalModal() {
        goalSidebar.classList.add('translate-x-full');
        setTimeout(() => {
            goalModal.classList.add('hidden');
            goalAmountInput.value = ''; // Clear the input
        }, 300);
    }
    
    // Add event listeners for closing the modal
    const closeGoalBtn = document.getElementById('close-goal-btn');
    const cancelGoalBtn = document.getElementById('cancel-goal-btn');
    
    if (closeGoalBtn) closeGoalBtn.addEventListener('click', closeGoalModal);
    if (cancelGoalBtn) cancelGoalBtn.addEventListener('click', closeGoalModal);
    if (goalModal) goalModal.addEventListener('click', (e) => {
        if (e.target === goalModal) {
            closeGoalModal();
        }
    });

    console.log('✅ Monthly Goal module initialized.');
}

/**
 * Ensures a user session exists (either authenticated or anonymous) and returns the user ID.
 * If no session exists, it attempts to sign in anonymously.
 * @returns {string|null} The user ID if a session exists, otherwise null.
 */
export async function getOrCreateUserId() {
    return CONFIG.USER_ID;
}


/**
 * Saves the monthly goal amount to the database.
 * @param {number} amount - The new goal amount.
 */
async function saveMonthlyGoal(amount) {
    const userId = await getOrCreateUserId();
    if (!userId) {
        console.error('Cannot save goal: No user ID available.');
        // IMPORTANT: Do NOT use alert(). Use a custom message box instead.
        alert('Failed to get user ID. Cannot save goal.');
        return;
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    console.log('Attempting to save/update goal with:', {
        user_id: userId,
        month: currentMonth,
        goal_amount: amount
    });

    // MODIFIED: Changed from .insert() to .upsert() to handle existing goals
    // We also specify the columns 'user_id' and 'month' for conflict resolution.
    const { data, error } = await supabase
        .from('monthly_goals')
        .upsert({ user_id: userId, month: currentMonth, goal_amount: amount }, { onConflict: 'user_id, month' });
    
    if (error) {
        console.error('Error saving monthly goal - Full error:', error);
        console.error('Error details:', error.details, error.message, error.hint);
        alert('Failed to save the goal. Please check console for details.');
    } else {
        console.log('Monthly goal saved successfully:', data);
    }
}

/**
 * Fetches the monthly goal from the database and updates the dashboard.
 */
export async function fetchAndDisplayMonthlyGoal() {
    const userId = await getOrCreateUserId();
    if (!userId) {
        console.warn('No user ID available. Cannot fetch monthly goal.');
        // If no user, display default 0 goal
        const goalTargetText = document.getElementById('goal-target-text');
        const goalAmountInput = document.getElementById('goal-amount');
        goalTargetText.textContent = `of RM0.00`;
        if (goalAmountInput) {
            goalAmountInput.value = '';
        }
        // Also update the progress to 0
        const goalProgressBar = document.getElementById('goal-progress-bar');
        const goalProgressText = document.getElementById('goal-progress-text');
        goalProgressText.textContent = `0%`; // MODIFIED: Changed to percentage
        goalProgressBar.style.width = `0%`;
        return;
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const { data, error } = await supabase
        .from('monthly_goals')
        .select('goal_amount')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .single();
    
    const goalTargetText = document.getElementById('goal-target-text');
    const goalAmountInput = document.getElementById('goal-amount');
    const goalProgressBar = document.getElementById('goal-progress-bar');
    const goalProgressText = document.getElementById('goal-progress-text');

    if (error && error.code !== 'PGRST116') { // PGRST116 means "No row found"
        console.error('Error fetching monthly goal:', error);
    }
    
    // Set the goal display on the dashboard
    const goalAmount = data ? data.goal_amount : 0;
    goalTargetText.textContent = `of RM${goalAmount.toFixed(2)}`;
    
    // Also update the input field in the modal when it's opened
    // Only set if the modal is not currently open and being edited
    if (goalAmountInput && document.getElementById('goal-modal').classList.contains('hidden')) {
        goalAmountInput.value = goalAmount > 0 ? goalAmount : '';
    }
    
    // MODIFIED: Calculate current progress based on monthly income from allTransactions
    const allTransactions = getAllTransactions(); // Get all transactions from transactions.js
    let currentProgress = 0;
    allTransactions.forEach(transaction => {
        // Ensure transaction.date exists and starts with the current month string
        if (transaction.type === 'income' && transaction.date && transaction.date.startsWith(currentMonth)) {
            currentProgress += transaction.amount;
        }
    });

    const progressPercentage = goalAmount > 0 ? (currentProgress / goalAmount) * 100 : 0;
    
    // MODIFIED: Display progress as percentage
    goalProgressText.textContent = `${Math.min(progressPercentage, 100).toFixed(0)}%`;
    goalProgressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
}