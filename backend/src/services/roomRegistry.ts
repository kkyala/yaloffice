import { supabase } from './supabaseService.js';

export interface RoomMetadata {
  roomName: string;
  createdAt: string;
  lastActiveAt: string;
  createdBy: string;
  sessionId?: string;
  jobId?: number;
  applicationId?: number;
  candidateName?: string;
  ttlSeconds: number;
  status: 'active' | 'idle' | 'closed';
}

class RoomRegistry {
  /**
   * Register a new room
   */
  async registerRoom(metadata: Omit<RoomMetadata, 'createdAt' | 'lastActiveAt' | 'status'>): Promise<void> {
    const room: RoomMetadata = {
      ...metadata,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: 'active'
    };

    const { error } = await supabase
      .from('rooms')
      .upsert({
        room_name: room.roomName,
        created_by: room.createdBy,
        session_id: room.sessionId,
        job_id: room.jobId,
        application_id: room.applicationId,
        candidate_name: room.candidateName,
        status: room.status,
        last_active_at: room.lastActiveAt,
        ttl_seconds: room.ttlSeconds,
        created_at: room.createdAt
      });

    if (error) {
      console.error(`[RoomRegistry] Failed to register room ${metadata.roomName}:`, error);
      throw error;
    }
    console.log(`[RoomRegistry] Registered room: ${metadata.roomName}`);
  }

  /**
   * Get room metadata
   */
  async getRoom(roomName: string): Promise<RoomMetadata | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_name', roomName)
      .single();

    if (error || !data) return null;

    return {
      roomName: data.room_name,
      createdAt: data.created_at,
      lastActiveAt: data.last_active_at,
      createdBy: data.created_by,
      sessionId: data.session_id,
      jobId: data.job_id,
      applicationId: data.application_id,
      candidateName: data.candidate_name,
      ttlSeconds: data.ttl_seconds,
      status: data.status
    };
  }

  /**
   * Update last active time
   */
  async updateLastActive(roomName: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .update({
        last_active_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('room_name', roomName);

    if (error) {
      console.error(`[RoomRegistry] Failed to update last active for ${roomName}:`, error);
    }
  }

  /**
   * Mark room as idle
   */
  async markIdle(roomName: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'idle' })
      .eq('room_name', roomName);

    if (error) {
      console.error(`[RoomRegistry] Failed to mark idle for ${roomName}:`, error);
    }
  }

  /**
   * Mark room as closed
   */
  async markClosed(roomName: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'closed' })
      .eq('room_name', roomName);

    if (error) {
      console.error(`[RoomRegistry] Failed to mark closed for ${roomName}:`, error);
    }
  }

  /**
   * Delete room from registry
   */
  async deleteRoom(roomName: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('room_name', roomName);

    if (error) {
      console.error(`[RoomRegistry] Failed to delete room ${roomName}:`, error);
    } else {
      console.log(`[RoomRegistry] Deleted room: ${roomName}`);
    }
  }

  /**
   * Get all rooms
   */
  async getAllRooms(): Promise<RoomMetadata[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*');

    if (error || !data) return [];

    return data.map(d => ({
      roomName: d.room_name,
      createdAt: d.created_at,
      lastActiveAt: d.last_active_at,
      createdBy: d.created_by,
      sessionId: d.session_id,
      jobId: d.job_id,
      applicationId: d.application_id,
      candidateName: d.candidate_name,
      ttlSeconds: d.ttl_seconds,
      status: d.status
    }));
  }

  /**
   * Get idle rooms (not active for TTL duration)
   */
  async getIdleRooms(): Promise<RoomMetadata[]> {
    // This logic is better handled by a DB query, but for now we'll fetch active rooms and filter
    // Or we can do a query where last_active_at < now - ttl
    // Since TTL can vary per room, we might need to fetch all active/idle rooms and check.

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .neq('status', 'closed');

    if (error || !data) return [];

    const now = Date.now();
    const idleRooms: RoomMetadata[] = [];

    for (const d of data) {
      const lastActive = new Date(d.last_active_at).getTime();
      const idleTime = (now - lastActive) / 1000; // seconds

      if (idleTime > d.ttl_seconds) {
        idleRooms.push({
          roomName: d.room_name,
          createdAt: d.created_at,
          lastActiveAt: d.last_active_at,
          createdBy: d.created_by,
          sessionId: d.session_id,
          jobId: d.job_id,
          applicationId: d.application_id,
          candidateName: d.candidate_name,
          ttlSeconds: d.ttl_seconds,
          status: d.status
        });
      }
    }

    return idleRooms;
  }

  /**
   * Clear all rooms (for testing)
   */
  async clearAll(): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .neq('room_name', 'placeholder_to_delete_all'); // Delete all rows

    console.log(`[RoomRegistry] Cleared all rooms`);
  }
}

export const roomRegistry = new RoomRegistry();
