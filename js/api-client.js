// js/api-client.js
import { supabase } from './supabase-client.js';
import { CONFIG } from './config.js';

export class ApiClient {
    constructor() {
        this.userId = CONFIG.USER_ID;
    }

    // ==========================================
    // CONTACTS CRUD OPERATIONS
    // ==========================================
    async createContact(contactData) {
        try {
            const { data, error } = await supabase.from('contacts').insert([{ ...contactData, user_id: this.userId }]).select().single();
            if (error) throw error;
            return { success: true, data, error: null };
        } catch (error) {
            console.error('❌ Error creating contact:', error.message);
            return { success: false, data: null, error: error.message };
        }
    }
    async getContacts() {
        try {
            const { data, error } = await supabase.from('contacts').select('*').eq('user_id', this.userId).order('created_at', { ascending: false });
            if (error) throw error;
            return { success: true, data: data || [], error: null };
        } catch (error) {
            console.error('❌ Error loading contacts:', error.message);
            return { success: false, data: [], error: error.message };
        }
    }
    async getContact(contactId) {
        try {
            const { data, error } = await supabase.from('contacts').select('*').eq('id', contactId).eq('user_id', this.userId).single();
            if (error) throw error;
            return { success: true, data, error: null };
        } catch (error) {
            console.error('❌ Error loading contact:', error.message);
            return { success: false, data: null, error: error.message };
        }
    }
    async updateContact(contactId, contactData) {
        try {
            const { data, error } = await supabase.from('contacts').update(contactData).eq('id', contactId).eq('user_id', this.userId).select().single();
            if (error) throw error;
            return { success: true, data, error: null };
        } catch (error) {
            console.error('❌ Error updating contact:', error.message);
            return { success: false, data: null, error: error.message };
        }
    }
    async deleteContact(contactId) {
        try {
            const { error } = await supabase.from('contacts').delete().eq('id', contactId).eq('user_id', this.userId);
            if (error) throw error;
            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Error deleting contact:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ==========================================
    // PROJECTS CRUD OPERATIONS
    // ==========================================
    async createProject(projectData) {
        try {
            const dataToInsert = {
                user_id: this.userId,
                contact_id: projectData.contact_id,
                name: projectData.name,
                status: projectData.status,
                client_name: projectData.contactName,
                description: projectData.description,
                total_amount: projectData.total_amount,
                tasks: projectData.tasks,
                payment_schedule: projectData.payment_schedule,
                // NEW: Add start_date to the dataToInsert object
                start_date: projectData.start_date,
            };
            const { data, error } = await supabase.from('projects').insert([dataToInsert]).select().single();
            if (error) throw error;
            // Create activity log after successful project creation
            await this.createActivity({
                project_id: data.id,
                contact_id: data.contact_id,
                activity_type: 'project_created',
                title: `Project Created: ${data.name}`
            });
            return { success: true, data };
        } catch (error) {
            console.error('❌ Error creating project:', error.message);
            return { success: false, error: error.message };
        }
    }
    async updateProject(projectId, projectData) {
        try {
            const dataToUpdate = {
                name: projectData.name,
                description: projectData.description,
                status: projectData.status,
                total_amount: projectData.total_amount,
                tasks: projectData.tasks,
                payment_schedule: projectData.payment_schedule,
                // NEW: Add start_date to the update object as well
                start_date: projectData.start_date,
            };

            console.log('✏️ Updating project:', projectId, dataToUpdate);
            
            const { data, error } = await supabase
                .from('projects')
                .update(dataToUpdate)
                .eq('id', projectId)
                .eq('user_id', this.userId)
                .select()
                .single();
            
            if (error) throw error;

            console.log('✅ Project updated successfully:', data);
            return { success: true, data };
        } catch (error)
        {
            console.error('❌ Error updating project:', error.message);
            return { success: false, error: error.message };
        }
    }
    async getProjectsByContact(contactId) {
        try {
            const { data, error } = await supabase.from('projects').select('*').eq('contact_id', contactId).eq('user_id', this.userId).order('created_at', { ascending: false });
            if (error) throw error;
            return { success: true, data: data || [], error: null };
        } catch (error) {
            console.error('❌ Error loading projects for contact:', error.message);
            return { success: false, data: [], error: error.message };
        }
    }
    async getAllProjects() {
        try {
            const { data, error } = await supabase.from('projects').select('*').eq('user_id', this.userId);
            if (error) throw error;
            return { success: true, data: data || [], error: null };
        } catch (error) {
            console.error('❌ Error loading all projects:', error.message);
            return { success: false, data: [], error: error.message };
        }
    }
    async getActivitiesByContact(contactId, limit = 20) {
        try {
            const { data, error } = await supabase.from('project_activities').select('*').eq('contact_id', contactId).eq('user_id', this.userId).order('created_at', { ascending: false }).limit(limit);
            if (error) throw error;
            return { success: true, data: data || [], error: null };
        } catch (error) {
            console.error('❌ Error loading activities:', error.message);
            return { success: false, data: [], error: error.message };
        }
    }
    async createActivity(activityData) {
        try {
            const dataToInsert = { ...activityData, user_id: this.userId };
            const { error } = await supabase.from('project_activities').insert([dataToInsert]);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Error creating activity log:', error);
            return { success: false, error: error.message };
        }
    }
    async deleteProject(projectId) {
        try {
            const { error } = await supabase.from('projects').delete().eq('id', projectId).eq('user_id', this.userId);
            if (error) throw error;
            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Error deleting project:', error.message);
            return { success: false, error: error.message };
        }
    }
}

export const apiClient = new ApiClient();