/**
 * Room Registry Service (In-Memory Implementation)
 *
 * Manages LiveKit room metadata and lifecycle.
 * For production, replace with Redis using ioredis.
 *
 * Structure:
 * - room:<roomName> -> Room metadata (hash)
 * - rooms:set -> Set of all active room names
 */

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
  private rooms: Map<string, RoomMetadata> = new Map();

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

    this.rooms.set(metadata.roomName, room);
    console.log(`[RoomRegistry] Registered room: ${metadata.roomName}`);
  }

  /**
   * Get room metadata
   */
  async getRoom(roomName: string): Promise<RoomMetadata | null> {
    return this.rooms.get(roomName) || null;
  }

  /**
   * Update last active time
   */
  async updateLastActive(roomName: string): Promise<void> {
    const room = this.rooms.get(roomName);
    if (room) {
      room.lastActiveAt = new Date().toISOString();
      room.status = 'active';
    }
  }

  /**
   * Mark room as idle
   */
  async markIdle(roomName: string): Promise<void> {
    const room = this.rooms.get(roomName);
    if (room) {
      room.status = 'idle';
    }
  }

  /**
   * Mark room as closed
   */
  async markClosed(roomName: string): Promise<void> {
    const room = this.rooms.get(roomName);
    if (room) {
      room.status = 'closed';
    }
  }

  /**
   * Delete room from registry
   */
  async deleteRoom(roomName: string): Promise<void> {
    this.rooms.delete(roomName);
    console.log(`[RoomRegistry] Deleted room: ${roomName}`);
  }

  /**
   * Get all rooms
   */
  async getAllRooms(): Promise<RoomMetadata[]> {
    return Array.from(this.rooms.values());
  }

  /**
   * Get idle rooms (not active for TTL duration)
   */
  async getIdleRooms(): Promise<RoomMetadata[]> {
    const now = Date.now();
    const rooms: RoomMetadata[] = [];

    for (const room of this.rooms.values()) {
      const lastActive = new Date(room.lastActiveAt).getTime();
      const idleTime = (now - lastActive) / 1000; // seconds

      if (idleTime > room.ttlSeconds) {
        rooms.push(room);
      }
    }

    return rooms;
  }

  /**
   * Clear all rooms (for testing)
   */
  async clearAll(): Promise<void> {
    this.rooms.clear();
    console.log(`[RoomRegistry] Cleared all rooms`);
  }
}

export const roomRegistry = new RoomRegistry();
