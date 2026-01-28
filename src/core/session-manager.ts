import logger from '../utils/logger.js';

export interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  connectedServers: string[];
  metadata: Record<string, unknown>;
}

export class SessionManager {
  private sessions: Map<string, Session>;
  private currentSessionId: string | null;

  constructor() {
    this.sessions = new Map();
    this.currentSessionId = null;
  }

  createSession(sessionId?: string): Session {
    const id = sessionId || this.generateSessionId();
    const session: Session = {
      id,
      createdAt: new Date(),
      lastActivity: new Date(),
      connectedServers: [],
      metadata: {},
    };

    this.sessions.set(id, session);
    this.currentSessionId = id;

    logger.info(`Session created: ${id}`);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getCurrentSession(): Session | null {
    if (!this.currentSessionId) {
      return null;
    }
    return this.sessions.get(this.currentSessionId) || null;
  }

  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  addConnectedServer(sessionId: string, serverId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && !session.connectedServers.includes(serverId)) {
      session.connectedServers.push(serverId);
      this.updateSessionActivity(sessionId);
    }
  }

  removeConnectedServer(sessionId: string, serverId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.connectedServers = session.connectedServers.filter(
        (id) => id !== serverId
      );
      this.updateSessionActivity(sessionId);
    }
  }

  setMetadata(sessionId: string, key: string, value: unknown): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata[key] = value;
      this.updateSessionActivity(sessionId);
    }
  }

  getMetadata(sessionId: string, key: string): unknown {
    const session = this.sessions.get(sessionId);
    return session?.metadata[key];
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    logger.info(`Session deleted: ${sessionId}`);
  }

  cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity.getTime();
      if (age > maxAgeMs) {
        this.deleteSession(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired sessions`);
    }

    return deletedCount;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}
