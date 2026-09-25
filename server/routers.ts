import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { randomBytes, randomUUID } from "crypto";

type Participant = { id: string; role: "sender" | "receiver"; joinedAt: number };
type SharedItem = { id: string; kind: "file" | "text" | "link"; name: string; mimeType?: string; size: number; data?: string; createdAt: number; sender: string };
type Session = { id: string; code: string; createdAt: number; expiresAt: number; participants: Participant[]; items: SharedItem[]; senderId: string; emptiedAt?: number };

const sessions = new Map<string, Session>();
type DownloadToken = { sessionId: string; participantId: string; itemId: string; status: "pending" | "complete" | "error" | "cancelled"; expiresAt: number; bytesSent: number; totalBytes: number };
const downloadTokens = new Map<string, DownloadToken>();
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const SESSION_MS = 30 * 60 * 1000;
const GRACE_MS = 5 * 60 * 1000;
// Grace period: a room that still has shared content survives this long after its
// last participant leaves, so a sender refresh (beforeunload leave beacon) or a
// brief disconnect does not wipe everything. Empty rooms vanish immediately.
const CODE_CHARS = "0123456789";

function newCode() { let value = ""; for (let i = 0; i < 4; i++) value += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return value; }
function publicSession(session: Session) { return { id: session.id, code: session.code, createdAt: session.createdAt, expiresAt: session.expiresAt, participants: session.participants, items: session.items }; }
function findSession(input: { sessionId?: string; code?: string }) { const session = input.sessionId ? sessions.get(input.sessionId) : Array.from(sessions.values()).find((s: Session) => s.code === input.code); if (!session || session.expiresAt <= Date.now()) { if (session) sessions.delete(session.id); throw new TRPCError({ code: "NOT_FOUND", message: "This sharing session has expired or does not exist." }); } return session; }
export function leaveAnonymousParticipant(sessionId: string, participantId: string) { const session = sessions.get(sessionId); if (!session) return; session.participants = session.participants.filter((p: Participant) => p.id !== participantId); if (session.participants.length === 0) { if (session.items.length === 0) sessions.delete(session.id); else session.emptiedAt = Date.now(); } }
export function addAnonymousItem(input: { sessionId: string; participantId: string; kind: "file" | "text" | "link"; name: string; mimeType?: string; size: number; data?: string }) { const session = findSession(input); if (!session.participants.some((p: Participant) => p.id === input.participantId)) throw new TRPCError({ code: "FORBIDDEN", message: "Participant is not connected to this session." }); if (input.kind === "file" && (!input.data || input.size > MAX_FILE_BYTES)) throw new TRPCError({ code: "BAD_REQUEST", message: "File exceeds the 100 MB limit or is missing data." }); const item: SharedItem = { id: randomUUID(), kind: input.kind, name: input.name, mimeType: input.mimeType, size: input.size, data: input.data, createdAt: Date.now(), sender: input.participantId }; session.items.push(item); return item; }

export function prepareAnonymousDownload(input: { sessionId: string; participantId: string; itemId: string }) { const item = getAnonymousFile(input); const token = randomUUID(); downloadTokens.set(token, { ...input, status: "pending", expiresAt: Date.now() + 120_000, bytesSent: 0, totalBytes: item.size }); setTimeout(() => downloadTokens.delete(token), 120_000); return { token, name: item.name }; }
export function getAnonymousDownload(token: string) { const record = downloadTokens.get(token); if (!record || record.expiresAt <= Date.now()) { if (record) downloadTokens.delete(token); throw new TRPCError({ code: "NOT_FOUND", message: "Download token expired." }); } return record; }
export function updateAnonymousDownload(token: string, status: "complete" | "error" | "cancelled") { const record = downloadTokens.get(token); if (record) record.status = status; }
export function updateAnonymousDownloadProgress(token: string, bytesSent: number, totalBytes?: number) { const record = downloadTokens.get(token); if (record) { record.bytesSent = bytesSent; if (totalBytes !== undefined) record.totalBytes = totalBytes; } }

export function getAnonymousFile(input: { sessionId: string; participantId: string; itemId: string }) { const session = findSession(input); if (!session.participants.some((p: Participant) => p.id === input.participantId)) throw new TRPCError({ code: "FORBIDDEN", message: "Participant is not connected to this session." }); const item = session.items.find((candidate: SharedItem) => candidate.id === input.itemId); if (!item || item.kind !== "file" || !item.data) throw new TRPCError({ code: "NOT_FOUND", message: "Shared file not found." }); return item; }
function cleanSessions() { const now = Date.now(); Array.from(sessions.entries()).forEach(([id, session]: [string, Session]) => { if (session.expiresAt <= now) { sessions.delete(id); return; } if (session.participants.length === 0 && (session.items.length === 0 || (session.emptiedAt ?? 0) + GRACE_MS <= now)) sessions.delete(id); }); }
setInterval(cleanSessions, 60_000);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  session: router({
    create: publicProcedure.mutation(() => { const id = randomUUID(); const now = Date.now(); const senderId = randomUUID(); const session: Session = { id, code: newCode(), createdAt: now, expiresAt: now + SESSION_MS, participants: [{ id: senderId, role: "sender", joinedAt: now }], items: [], senderId }; sessions.set(id, session); return { session: publicSession(session), participantId: senderId }; }),
    join: publicProcedure.input(z.object({ code: z.string().regex(/^\d{4}$/), participantId: z.string().optional() })).mutation(({ input }) => { const session: Session = findSession({ code: input.code }); const existing = session.participants.find((p: Participant) => p.id === input.participantId); if (existing) return { session: publicSession(session), participantId: existing.id }; const participantId = randomUUID(); session.participants.push({ id: participantId, role: "receiver", joinedAt: Date.now() }); session.emptiedAt = undefined; return { session: publicSession(session), participantId }; }),
    get: publicProcedure.input(z.object({ sessionId: z.string(), participantId: z.string() })).query(({ input }) => { const session = findSession(input); if (!session.participants.some((p: Participant) => p.id === input.participantId)) { if (input.participantId === session.senderId) { session.participants.push({ id: input.participantId, role: "sender", joinedAt: Date.now() }); session.emptiedAt = undefined; } else throw new TRPCError({ code: "FORBIDDEN", message: "Participant is not connected to this session." }); } return publicSession(session); }),
    addItem: publicProcedure.input(z.object({ sessionId: z.string(), participantId: z.string(), kind: z.enum(["file", "text", "link"]), name: z.string().max(180), mimeType: z.string().max(120).optional(), size: z.number().int().min(0).max(MAX_FILE_BYTES), data: z.string().max(140_000_000).optional() })).mutation(({ input }) => addAnonymousItem(input)),
    leave: publicProcedure.input(z.object({ sessionId: z.string(), participantId: z.string() })).mutation(({ input }) => { leaveAnonymousParticipant(input.sessionId, input.participantId); return { success: true }; }),
  }),
});
export const __testing = { expireSession: (id: string) => { const session = sessions.get(id); if (session) session.expiresAt = Date.now() - 1; } };
export type AppRouter = typeof appRouter;
