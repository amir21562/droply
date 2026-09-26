import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const caller = appRouter.createCaller({} as any);

describe("role switching (sender <-> receiver handoff)", () => {
  it("hands the sender role to a receiver and demotes the previous sender", async () => {
    const { session, participantId: alice } = await caller.session.create();
    const joined = await caller.session.join({ code: session.code });
    const bob = joined.participantId;

    const { session: updated } = await caller.session.switchRole({ sessionId: session.id, participantId: bob, targetRole: "sender" });
    expect(updated.participants.find((p) => p.id === bob)?.role).toBe("sender");
    expect(updated.participants.find((p) => p.id === alice)?.role).toBe("receiver");
  });

  it("lets the current sender step down to receiver when another participant is present", async () => {
    const { session, participantId: alice } = await caller.session.create();
    const { participantId: bob } = await caller.session.join({ code: session.code });

    const { session: updated } = await caller.session.switchRole({ sessionId: session.id, participantId: alice, targetRole: "receiver" });
    expect(updated.participants.find((p) => p.id === alice)?.role).toBe("receiver");
    expect(updated.participants.find((p) => p.id === bob)?.role).toBe("sender");
  });

  it("moves sender-only powers (remove, delete) to the successor when the sender steps down", async () => {
    const { session, participantId: alice } = await caller.session.create();
    const { participantId: bob } = await caller.session.join({ code: session.code });
    await caller.session.addItem({ sessionId: session.id, participantId: alice, kind: "text", name: "note", size: 4, data: "note" });
    const itemId = (await caller.session.get({ sessionId: session.id, participantId: alice })).items[0].id;

    await caller.session.switchRole({ sessionId: session.id, participantId: alice, targetRole: "receiver" });

    // stepped-down sender can no longer remove or delete
    await expect(caller.session.removeItem({ sessionId: session.id, participantId: alice, itemId })).rejects.toThrow();
    await expect(caller.session.destroy({ sessionId: session.id, participantId: alice })).rejects.toThrow();
    // successor can
    await caller.session.removeItem({ sessionId: session.id, participantId: bob, itemId });
    await caller.session.destroy({ sessionId: session.id, participantId: bob });
  });

  it("refuses to let a lone sender step down — the room must keep a sender", async () => {
    const { session, participantId: alice } = await caller.session.create();

    await expect(
      caller.session.switchRole({ sessionId: session.id, participantId: alice, targetRole: "receiver" })
    ).rejects.toThrow(/wait for someone to join/i);

    // alice is still the sender afterwards
    const current = await caller.session.get({ sessionId: session.id, participantId: alice });
    expect(current.participants.find((p) => p.id === alice)?.role).toBe("sender");
  });

  it("treats a receiver requesting the receiver role as a harmless no-op", async () => {
    const { session, participantId: alice } = await caller.session.create();
    const { participantId: bob } = await caller.session.join({ code: session.code });

    const { session: updated } = await caller.session.switchRole({ sessionId: session.id, participantId: bob, targetRole: "receiver" });
    expect(updated.participants.find((p) => p.id === alice)?.role).toBe("sender");
    expect(updated.participants.find((p) => p.id === bob)?.role).toBe("receiver");
  });

  it("keeps exactly one sender when two receivers claim the role back-to-back", async () => {
    const { session } = await caller.session.create();
    const { participantId: bob } = await caller.session.join({ code: session.code });
    const { participantId: carol } = await caller.session.join({ code: session.code });

    await caller.session.switchRole({ sessionId: session.id, participantId: bob, targetRole: "sender" });
    const { session: updated } = await caller.session.switchRole({ sessionId: session.id, participantId: carol, targetRole: "sender" });

    const senders = updated.participants.filter((p) => p.role === "sender");
    expect(senders).toHaveLength(1);
    expect(senders[0].id).toBe(carol);
    expect(bob).not.toBe(carol);
  });

  it("rejects role switches from outsiders", async () => {
    const { session } = await caller.session.create();
    await expect(caller.session.switchRole({ sessionId: session.id, participantId: "ghost", targetRole: "sender" })).rejects.toThrow();
  });

  it("lets a lone receiver claim the sender role after the sender leaves (host migration)", async () => {
    const { session, participantId: alice } = await caller.session.create();
    const { participantId: bob } = await caller.session.join({ code: session.code });
    await caller.session.leave({ sessionId: session.id, participantId: alice });

    const { session: updated } = await caller.session.switchRole({ sessionId: session.id, participantId: bob, targetRole: "sender" });
    expect(updated.participants.find((p) => p.id === bob)?.role).toBe("sender");
  });
});
