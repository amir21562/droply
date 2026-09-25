import { describe, expect, it } from "vitest";
import { appRouter, leaveAnonymousParticipant, prepareAnonymousDownload, updateAnonymousDownload } from "./routers";

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

describe("receiver download notifications", () => {
  it("counts a receiver's completed download on the item, ignores the sender's own download, and never double-counts", async () => {
    const { session, participantId } = await caller.session.create();
    const item = await caller.session.addItem({
      sessionId: session.id,
      participantId,
      kind: "file",
      name: "a.png",
      mimeType: "image/png",
      size: 4,
      data: "abcd",
    });
    expect(item.downloads).toBe(0);

    const joined = await caller.session.join({ code: session.code });
    const token = prepareAnonymousDownload({ sessionId: session.id, participantId: joined.participantId, itemId: item.id });
    updateAnonymousDownload(token.token, "complete");
    const refreshed = await caller.session.get({ sessionId: session.id, participantId });
    expect(refreshed.items[0].downloads).toBe(1);

    // sender re-downloading their own file must not trigger a "receiver downloaded" notification
    const own = prepareAnonymousDownload({ sessionId: session.id, participantId, itemId: item.id });
    updateAnonymousDownload(own.token, "complete");
    const again = await caller.session.get({ sessionId: session.id, participantId });
    expect(again.items[0].downloads).toBe(1);

    // completing the same token twice must not double-count
    updateAnonymousDownload(token.token, "complete");
    const thrice = await caller.session.get({ sessionId: session.id, participantId });
    expect(thrice.items[0].downloads).toBe(1);
  });
});

describe("sender remove item", () => {
  async function makeRoomWithItems() {
    const { session, participantId } = await caller.session.create();
    const a = await caller.session.addItem({ sessionId: session.id, participantId, kind: "text", name: "one", size: 3, data: "one" });
    const b = await caller.session.addItem({ sessionId: session.id, participantId, kind: "text", name: "two", size: 3, data: "two" });
    return { sessionId: session.id, senderId: participantId, a, b };
  }

  it("lets the sender remove one item while keeping the rest", async () => {
    const { sessionId, senderId, a } = await makeRoomWithItems();
    const result = await caller.session.removeItem({ sessionId, participantId: senderId, itemId: a.id });
    expect(result.id).toBe(a.id);
    const restored = await caller.session.get({ sessionId, participantId: senderId });
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].name).toBe("two");
  });

  it("refuses a receiver trying to remove an item", async () => {
    const fresh = await makeRoomWithItems();
    const code = (await caller.session.get({ sessionId: fresh.sessionId, participantId: fresh.senderId })).code;
    const joined = await caller.session.join({ code });
    await expect(
      caller.session.removeItem({ sessionId: fresh.sessionId, participantId: joined.participantId, itemId: fresh.a.id })
    ).rejects.toThrow(/Only the sender/);
    // the item is still there for everyone
    const restored = await caller.session.get({ sessionId: fresh.sessionId, participantId: fresh.senderId });
    expect(restored.items).toHaveLength(2);
  });

  it("throws NOT_FOUND for an item that is not in the room", async () => {
    const { sessionId, senderId } = await makeRoomWithItems();
    await expect(caller.session.removeItem({ sessionId, participantId: senderId, itemId: "nope" })).rejects.toThrow(/no longer in this room/);
  });
});
