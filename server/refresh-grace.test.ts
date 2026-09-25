import { describe, expect, it } from "vitest";
import { appRouter, leaveAnonymousParticipant } from "./routers";

const caller = appRouter.createCaller({} as any);

describe("refresh persistence (grace period)", () => {
  it("keeps a room with items alive after the sender's refresh beacon, and lets the sender back in", async () => {
    const { session, participantId } = await caller.session.create();
    await caller.session.addItem({
      sessionId: session.id,
      participantId,
      kind: "text",
      name: "hello",
      size: 5,
      data: "hello",
    });

    // sender refreshes -> beforeunload beacon fires leave
    leaveAnonymousParticipant(session.id, participantId);

    // restore on reload: get() should re-admit the original sender with items intact
    const restored = await caller.session.get({ sessionId: session.id, participantId });
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].data).toBe("hello");
    expect(restored.participants.some((p) => p.id === participantId && p.role === "sender")).toBe(true);
  });

  it("still deletes an empty room immediately when the last participant leaves", async () => {
    const { session, participantId } = await caller.session.create();
    leaveAnonymousParticipant(session.id, participantId);
    await expect(caller.session.get({ sessionId: session.id, participantId })).rejects.toThrow();
  });

  it("lets a receiver join a graced room by code", async () => {
    const { session, participantId } = await caller.session.create();
    await caller.session.addItem({
      sessionId: session.id,
      participantId,
      kind: "text",
      name: "note",
      size: 4,
      data: "note",
    });
    leaveAnonymousParticipant(session.id, participantId);

    const joined = await caller.session.join({ code: session.code });
    expect(joined.session.items).toHaveLength(1);
    expect(joined.participantId).not.toBe(participantId);
  });

  it("destroy lets only the original sender delete the room immediately", async () => {
    const { session, participantId } = await caller.session.create();
    await caller.session.addItem({
      sessionId: session.id,
      participantId,
      kind: "text",
      name: "note",
      size: 4,
      data: "note",
    });
    const joined = await caller.session.join({ code: session.code });
    await expect(
      caller.session.destroy({ sessionId: session.id, participantId: joined.participantId })
    ).rejects.toThrow("Only the sender");
    await caller.session.destroy({ sessionId: session.id, participantId });
    await expect(caller.session.get({ sessionId: session.id, participantId })).rejects.toThrow();
  });

  it("rejects a stranger's stale participant id on get (receiver must rejoin via code)", async () => {
    const { session, participantId } = await caller.session.create();
    await caller.session.addItem({
      sessionId: session.id,
      participantId,
      kind: "text",
      name: "note",
      size: 4,
      data: "note",
    });
    await expect(
      caller.session.get({ sessionId: session.id, participantId: "not-a-participant" })
    ).rejects.toThrow("not connected");
  });
});
