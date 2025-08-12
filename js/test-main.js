console.log('🚀 Test app starting...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('📅 DOM loaded');
    
    // Test if we can find the calendar
    const monthYear = document.getElementById('monthYear');
    if (monthYear) {
        monthYear.textContent = 'January 2025 - TEST MODE';
        console.log('✅ Found calendar elements');
    } else {
        console.log('❌ Calendar elements not found');
    }
});