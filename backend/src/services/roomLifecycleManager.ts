/**
 * Room Lifecycle Manager
 *
 * Background daemon that monitors LiveKit rooms and closes idle ones.
 * Runs every 60 seconds to check for idle rooms and clean them up.
 *
 * Features:
 * - Detects idle rooms based on TTL
 * - Closes rooms via LiveKit REST API
 * - Removes registry entries
 * - Prevents ghost rooms
 */

import { roomRegistry } from './roomRegistry.js';

const LIVEKIT_REST_URL = process.env.LIVEKIT_REST_URL || 'http://localhost:7881';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

class RoomLifecycleManager {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the lifecycle manager
   */
  start(): void {
    if (this.isRunning) {
      console.log('[RoomLifecycleManager] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[RoomLifecycleManager] Started (checking every ${CHECK_INTERVAL_MS / 1000}s)`);

    // Run immediately, then on interval
    this.checkAndCleanRooms();
    this.intervalId = setInterval(() => this.checkAndCleanRooms(), CHECK_INTERVAL_MS);
  }

  /**
   * Stop the lifecycle manager
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[RoomLifecycleManager] Stopped');
  }

  /**
   * Check for idle rooms and clean them up
   */
  private async checkAndCleanRooms(): Promise<void> {
    try {
      const idleRooms = await roomRegistry.getIdleRooms();

      if (idleRooms.length === 0) {
        console.log('[RoomLifecycleManager] No idle rooms to clean');
        return;
      }

      console.log(`[RoomLifecycleManager] Found ${idleRooms.length} idle rooms`);

      for (const room of idleRooms) {
        await this.closeRoom(room.roomName);
      }
    } catch (error) {
      console.error('[RoomLifecycleManager] Error during cleanup:', error);
    }
  }

  /**
   * Close a room via LiveKit REST API and remove from registry
   */
  private async closeRoom(roomName: string): Promise<void> {
    try {
      console.log(`[RoomLifecycleManager] Closing room: ${roomName}`);

      // Call LiveKit REST API to delete the room
      const auth = Buffer.from(`${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}`).toString('base64');

      const response = await fetch(`${LIVEKIT_REST_URL}/twirp/livekit.RoomService/DeleteRoom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ room: roomName })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[RoomLifecycleManager] Failed to close room ${roomName}:`, text);
      } else {
        console.log(`[RoomLifecycleManager] Room closed successfully: ${roomName}`);
      }

      // Remove from registry regardless of API result
      await roomRegistry.markClosed(roomName);
      await roomRegistry.deleteRoom(roomName);

    } catch (error) {
      console.error(`[RoomLifecycleManager] Error closing room ${roomName}:`, error);
    }
  }

  /**
   * Get current status
   */
  getStatus(): { isRunning: boolean; interval: number } {
    return {
      isRunning: this.isRunning,
      interval: CHECK_INTERVAL_MS
    };
  }
}

export const roomLifecycleManager = new RoomLifecycleManager();
