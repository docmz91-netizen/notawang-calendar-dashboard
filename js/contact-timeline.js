/**
 * js/contact-timeline.js
 * This module is responsible for rendering the activity timeline for a specific contact.
 */

import { apiClient } from './api-client.js';

// --- Main Exported Function ---
/**
 * Creates and initializes the contact timeline component.
 * @param {string} contactId - The ID of the contact whose activities to load.
 * @param {HTMLElement} container - The DOM element to render the component into.
 * @returns {Promise<object>} An object with component methods.
 */
export async function createContactTimeline(contactId, container) {
    console.log(`🚀 Initializing timeline component for contact ID: ${contactId}`);
    
    const component = new ContactTimeline(contactId, container);
    await component.loadAndRender();
    
    return component;
}

// --- Component Class ---
class ContactTimeline {
    constructor(contactId, container) {
        this.contactId = contactId;
        this.container = container;
        this.activities = [];
    }

    /**
     * Fetches activity data from the API and triggers the rendering process.
     */
    async loadAndRender() {
        try {
            // --- THIS IS THE FIX: Replaced mock data with a real API call ---
            const result = await apiClient.getActivitiesByContact(this.contactId);
            
            if (result.success) {
                this.activities = result.data || [];
                this.render();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Error loading timeline activities:', error);
            this.renderError(error.message);
        }
    }

    /**
     * Renders the entire timeline component UI into the container.
     */
    render() {
        this.container.innerHTML = ''; // Clear previous content

        const title = document.createElement('h2');
        title.className = 'text-lg font-bold text-gray-900 px-1 mb-6';
        title.textContent = 'Activity Timeline';
        this.container.appendChild(title);

        const timelineContainer = document.createElement('div');
        timelineContainer.className = 'space-y-8 border-l-2 border-gray-200 ml-2';

        if (this.activities.length > 0) {
            this.activities.forEach(activity => {
                const activityElement = this.renderTimelineItem(activity);
                timelineContainer.appendChild(activityElement);
            });
        } else {
            timelineContainer.innerHTML = `<p class="pl-4 text-sm text-gray-500">No activities found for this contact.</p>`;
        }
        
        this.container.appendChild(timelineContainer);
    }

    /**
     * Creates the HTML element for a single timeline item.
     * @param {object} activity - The activity data object.
     * @returns {HTMLElement} The timeline item element.
     */
    renderTimelineItem(activity) {
        const item = document.createElement('div');
        item.className = 'relative pl-8';

        const { iconColor, title, description } = this.formatActivity(activity);
        
        // Format the date and time nicely
        const activityDate = new Date(activity.created_at);
        const formattedDateTime = `${activityDate.toLocaleDateString()} ${activityDate.toLocaleTimeString()}`;

        item.innerHTML = `
            <div class="absolute left-0 top-1 transform -translate-x-1/2 w-3 h-3 ${iconColor} rounded-full border-2 border-white"></div>
            <p class="text-xs text-gray-500 mb-1">${formattedDateTime}</p>
            <p class="text-sm font-medium text-gray-800">${title}</p>
            ${description ? `<p class="text-sm text-gray-600 p-2 bg-gray-100 rounded-md mt-1">${description}</p>` : ''}
        `;
        return item;
    }

    /**
     * Formats an activity object into human-readable title, description, and color.
     * @param {object} activity - The activity data from the database.
     * @returns {object} An object with iconColor, title, and description.
     */
    formatActivity(activity) {
        // This function will need to be updated once we have real activity data
        // For now, it provides a basic structure.
        switch (activity.activity_type) {
            case 'project_created':
                return {
                    iconColor: 'bg-green-500',
                    title: `Project Created: <span class="font-bold">${activity.title}</span>`,
                    description: ''
                };
            case 'status_changed':
                return {
                    iconColor: 'bg-blue-500',
                    title: `Status changed to <span class="font-bold">${activity.description}</span>`,
                    description: `For project: ${activity.title}`
                };
            case 'payment_received':
                 return {
                    iconColor: 'bg-violet-500',
                    title: 'Payment Received',
                    description: activity.description
                };
            case 'note_added':
                return {
                    iconColor: 'bg-gray-400',
                    title: 'Note Added',
                    description: `"${activity.description}"`
                };
            default:
                return {
                    iconColor: 'bg-gray-400',
                    title: activity.title || 'Activity',
                    description: activity.description
                };
        }
    }
    
    /**
     * Renders an error message in the container.
     */
    renderError(errorMessage) {
        this.container.innerHTML = `<div class="p-4 text-red-600">Error: Could not load timeline. ${errorMessage}</div>`;
    }
}