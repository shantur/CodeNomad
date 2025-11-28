import type { Session } from "../types/session";

export interface SessionGroup {
  parent: Session;
  children: Session[];
}

export function groupSessionsByParent(sessions: Map<string, Session> | Session[]): SessionGroup[] {
  const sessionArray = Array.isArray(sessions)
    ? sessions
    : Array.from(sessions.values());
  const grouped = new Map<string, SessionGroup>();

  for (const session of sessionArray) {
    if (session.parentId === null) {
      grouped.set(session.id, { parent: session, children: [] });
    }
  }

  for (const session of sessionArray) {
    if (session.parentId !== null) {
      const isSubAgent = session.title?.includes("subagent)");
      if (isSubAgent) {
        const group = grouped.get(session.parentId);
        if (group) {
          group.children.push(session);
        }
      } else {
        grouped.set(session.id, { parent: session, children: [] });
      }
    }
  }

  for (const [_, group] of grouped) {
    group.children.sort(
      (a, b) => (b.time.updated || 0) - (a.time.updated || 0),
    );
  }

  return Array.from(grouped.values()).sort(
    (a, b) => (b.parent.time.updated || 0) - (a.parent.time.updated || 0),
  );
}
