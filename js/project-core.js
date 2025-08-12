/**
 * projects-core.js - Core Projects Management System
 * Handles CRUD operations and shared logic for both Contact Detail and Kanban views
 */

import { supabase } from './supabase-client.js';
import { CONFIG } from './config.js';

/**
 * Core Projects Manager Class
 */
export class ProjectsCore {
    constructor() {
        this.userId = CONFIG.DEFAULT_USER_ID;
        this.projects = [];
        this.activities = [];
        this.statusConfig = {
            inquiry: { label: 'Inquiry', color: '#3b82f6', order: 1 },
            quotation: { label: 'Quotation', color: '#f59e0b', order: 2 },
            invoice: { label: 'Invoice', color: '#ef4444', order: 3 },
            'half-paid': { label: 'Half Paid', color: '#8b5cf6', order: 4 },
            'fully-paid': { label: 'Fully Paid', color: '#10b981', order: 5 }
        };
    }

    /**
     * Initialize the projects system
     */
    async init() {
        console.log('🚀 Initializing Projects Core...');
        
        try {
            await this.loadAllProjects();
            await this.loadAllActivities();
            console.log('✅ Projects Core initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Projects Core:', error);
            return false;
        }
    }

    // ============================================
    // PROJECT CRUD OPERATIONS
    // ============================================

    /**
     * Load all projects for the current user
     */
    async loadAllProjects() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    contacts:contact_id (
                        id,
                        name,
                        email,
                        company
                    )
                `)
                .eq('user_id', this.userId)
                .order('status')
                .order('board_position');

            if (error) throw error;

            this.projects = data || [];
            console.log(`📊 Loaded ${this.projects.length} projects`);
            return this.projects;
        } catch (error) {
            console.error('❌ Error loading projects:', error);
            return [];
        }
    }

    /**
     * Load projects for a specific contact
     * @param {string} contactId - Contact ID
     */
    async getProjectsByContact(contactId) {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', this.userId)
                .eq('contact_id', contactId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`📋 Loaded ${data.length} projects for contact ${contactId}`);
            return data || [];
        } catch (error) {
            console.error('❌ Error loading projects for contact:', error);
            return [];
        }
    }

    /**
     * Create a new project
     * @param {Object} projectData - Project data
     */
    async createProject(projectData) {
        try {
            // Get the next board position for this status
            const maxPosition = await this.getMaxBoardPosition(projectData.status || 'inquiry');
            
            const newProject = {
                ...projectData,
                user_id: this.userId,
                board_position: maxPosition + 1,
                completion_percentage: this.getDefaultCompletionByStatus(projectData.status || 'inquiry'),
                priority: projectData.priority || 'medium',
                currency: projectData.currency || 'MYR',
                paid_amount: projectData.paid_amount || 0,
                project_type: projectData.project_type || 'general'
            };

            const { data, error } = await supabase
                .from('projects')
                .insert([newProject])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Project created:', data.name);
            
            // Reload projects to update local state
            await this.loadAllProjects();
            
            return data;
        } catch (error) {
            console.error('❌ Error creating project:', error);
            throw error;
        }
    }

    /**
     * Update a project
     * @param {string} projectId - Project ID
     * @param {Object} updates - Fields to update
     */
    async updateProject(projectId, updates) {
        try {
            const { data, error } = await supabase
                .from('projects')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', projectId)
                .eq('user_id', this.userId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Project updated:', data.name);
            
            // Reload projects to update local state
            await this.loadAllProjects();
            
            return data;
        } catch (error) {
            console.error('❌ Error updating project:', error);
            throw error;
        }
    }

    /**
     * Update project status (triggers activity logging)
     * @param {string} projectId - Project ID
     * @param {string} newStatus - New status
     */
    async updateProjectStatus(projectId, newStatus) {
        try {
            const updates = {
                status: newStatus,
                completion_percentage: this.getDefaultCompletionByStatus(newStatus)
            };

            // If moving to fully-paid, set completed date
            if (newStatus === 'fully-paid') {
                updates.completed_date = new Date().toISOString().split('T')[0];
            }

            return await this.updateProject(projectId, updates);
        } catch (error) {
            console.error('❌ Error updating project status:', error);
            throw error;
        }
    }

    /**
     * Delete a project
     * @param {string} projectId - Project ID
     */
    async deleteProject(projectId) {
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId)
                .eq('user_id', this.userId);

            if (error) throw error;

            console.log('✅ Project deleted');
            
            // Reload projects to update local state
            await this.loadAllProjects();
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting project:', error);
            throw error;
        }
    }

    // ============================================
    // ACTIVITY/TIMELINE OPERATIONS
    // ============================================

    /**
     * Load all activities
     */
    async loadAllActivities() {
        try {
            const { data, error } = await supabase
                .from('project_activities')
                .select(`
                    *,
                    projects:project_id (
                        name,
                        status
                    ),
                    contacts:contact_id (
                        name,
                        company
                    )
                `)
                .eq('user_id', this.userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.activities = data || [];
            console.log(`📅 Loaded ${this.activities.length} activities`);
            return this.activities;
        } catch (error) {
            console.error('❌ Error loading activities:', error);
            return [];
        }
    }

    /**
     * Get activities for a specific contact
     * @param {string} contactId - Contact ID
     */
    async getActivitiesByContact(contactId) {
        try {
            const { data, error } = await supabase
                .from('project_activities')
                .select(`
                    *,
                    projects:project_id (
                        name,
                        status
                    )
                `)
                .eq('contact_id', contactId)
                .eq('user_id', this.userId)
                .order('created_at', { ascending: false })
                .limit(20); // Latest 20 activities

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('❌ Error loading activities for contact:', error);
            return [];
        }
    }

    /**
     * Add a manual activity/note
     * @param {string} projectId - Project ID
     * @param {Object} activityData - Activity data
     */
    async addActivity(projectId, activityData) {
        try {
            // Get project details for contact_id
            const project = this.projects.find(p => p.id === projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            const activity = {
                project_id: projectId,
                contact_id: project.contact_id,
                user_id: this.userId,
                activity_type: activityData.type || 'note_added',
                title: activityData.title,
                description: activityData.description,
                created_by: this.userId
            };

            const { data, error } = await supabase
                .from('project_activities')
                .insert([activity])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Activity added:', data.title);
            return data;
        } catch (error) {
            console.error('❌ Error adding activity:', error);
            throw error;
        }
    }

    // ============================================
    // KANBAN BOARD OPERATIONS
    // ============================================

    /**
     * Get projects grouped by status (for Kanban board)
     */
    getProjectsByStatus() {
        const grouped = {
            inquiry: [],
            quotation: [],
            invoice: [],
            'half-paid': [],
            'fully-paid': []
        };

        this.projects.forEach(project => {
            if (grouped[project.status]) {
                grouped[project.status].push(project);
            }
        });

        // Sort each group by board_position
        Object.keys(grouped).forEach(status => {
            grouped[status].sort((a, b) => a.board_position - b.board_position);
        });

        return grouped;
    }

    /**
     * Update board positions after drag and drop
     * @param {string} projectId - Project ID
     * @param {string} newStatus - New status column
     * @param {number} newPosition - New position in column
     */
    async updateBoardPosition(projectId, newStatus, newPosition) {
        try {
            // Get all projects in the target status
            const { data: statusProjects, error: fetchError } = await supabase
                .from('projects')
                .select('id, board_position')
                .eq('status', newStatus)
                .eq('user_id', this.userId)
                .order('board_position');

            if (fetchError) throw fetchError;

            // Update positions
            const updates = [];
            
            // First, update the moved project
            updates.push(
                supabase
                    .from('projects')
                    .update({ 
                        status: newStatus, 
                        board_position: newPosition,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', projectId)
                    .eq('user_id', this.userId)
            );

            // Then update positions of other projects in the column
            statusProjects.forEach((project, index) => {
                if (project.id !== projectId) {
                    const adjustedPosition = index >= newPosition ? index + 1 : index;
                    if (project.board_position !== adjustedPosition) {
                        updates.push(
                            supabase
                                .from('projects')
                                .update({ board_position: adjustedPosition })
                                .eq('id', project.id)
                        );
                    }
                }
            });

            // Execute all updates
            await Promise.all(updates);

            console.log('✅ Board positions updated');
            
            // Reload projects
            await this.loadAllProjects();
            
            return true;
        } catch (error) {
            console.error('❌ Error updating board position:', error);
            throw error;
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get max board position for a status
     * @param {string} status - Project status
     */
    async getMaxBoardPosition(status) {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('board_position')
                .eq('status', status)
                .eq('user_id', this.userId)
                .order('board_position', { ascending: false })
                .limit(1);

            if (error) throw error;

            return data.length > 0 ? data[0].board_position : 0;
        } catch (error) {
            console.error('❌ Error getting max board position:', error);
            return 0;
        }
    }

    /**
     * Get default completion percentage by status
     * @param {string} status - Project status
     */
    getDefaultCompletionByStatus(status) {
        const defaults = {
            inquiry: 10,
            quotation: 25,
            invoice: 50,
            'half-paid': 75,
            'fully-paid': 100
        };
        return defaults[status] || 10;
    }

    /**
     * Get status configuration
     * @param {string} status - Status to get config for
     */
    getStatusConfig(status) {
        return this.statusConfig[status] || { label: status, color: '#6b7280', order: 0 };
    }

    /**
     * Format currency amount
     * @param {number} amount - Amount to format
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    }

    /**
     * Format date for display
     * @param {string} dateString - Date string
     */
    formatDate(dateString) {
        if (!dateString) return 'Not set';
        
        return new Date(dateString).toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Get time ago string
     * @param {string} dateString - Date string
     */
    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return this.formatDate(dateString);
    }

    // ============================================
    // GETTERS FOR COMPONENTS
    // ============================================

    /**
     * Get all projects
     */
    getAllProjects() {
        return this.projects;
    }

    /**
     * Get project by ID
     * @param {string} projectId - Project ID
     */
    getProjectById(projectId) {
        return this.projects.find(project => project.id === projectId);
    }

    /**
     * Get projects for contact (cached)
     * @param {string} contactId - Contact ID
     */
    getProjectsForContact(contactId) {
        return this.projects.filter(project => project.contact_id === contactId);
    }

    /**
     * Get recent activities
     * @param {number} limit - Number of activities to return
     */
    getRecentActivities(limit = 10) {
        return this.activities.slice(0, limit);
    }
}

// Create and export singleton instance
export const projectsCore = new ProjectsCore();

// =================================================================
// NEW FUNCTIONS FOR CALENDAR INTEGRATION
// These are exported for use in calendar.js
// =================================================================

/**
 * Get project items for a specific date (for calendar view)
 * @param {Object} projectData - Deprecated, uses projectsCore instance now
 * @param {string} dateString - The date to check (YYYY-MM-DD)
 * @returns {Array} - Array of project items for that date
 */
export function getProjectItemsForDate(projectData, dateString) {
    // Uses the singleton instance to get all projects
    const allProjects = projectsCore.getAllProjects();
    
    if (!allProjects || allProjects.length === 0) {
        return [];
    }
    
    return allProjects.filter(project => {
        const startDate = project.start_date ? project.start_date.split('T')[0] : null;
        const endDate = project.end_date ? project.end_date.split('T')[0] : null;
        
        // Check if the date falls on the start date or end date
        return startDate === dateString || endDate === dateString;
    });
}

/**
 * Get the color for a project item based on its status
 * @param {Object} item - The project item
 * @returns {string} - The hex color code for the status
 */
export function getProjectItemColor(item) {
    if (!item || !item.status) {
        return '#6b7280'; // Default gray color
    }
    // Uses the singleton instance to get status config
    return projectsCore.getStatusConfig(item.status).color;
}


// Make it globally available for debugging
window.projectsCore = projectsCore;
