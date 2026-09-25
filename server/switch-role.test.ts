import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const caller = appRouter.createCaller({} as any);

describe("role switching (sender <-> receiver handoff)", () => {
  it("hands the sender role to a receiver and demotes the previous sender", async () => {
    const { session, participantId: alice } = await caller.session.create();
    const joined = await caller.session.join({ code: session.code });
    const bob = joined.participantId;

    const { session: updated } = await caller.session.switchRole({ sessionId: session.id, participantId: bob });
    expect(updated.participants.find((p) => p.id === bob)?.role).toBe("sender");
    expect(updated.participants.find((p) => p.id === alice)?.role).toBe("receiver");
  });

  it("moves sender-only powers (remove, delete) to the new sender", async () => {
    const { session, participantId: alice } = await caller.session.create();
    const { participantId: bob } = await caller.session.join({ code: session.code });
    await caller.session.addItem({ sessionId: session.id, participantId: alice, kind: "text", name: "note", size: 4, data: "note" });
    const itemId = (await caller.session.get({ sessionId: session.id, participantId: alice })).items[0].id;

    await caller.session.switchRole({ sessionId: session.id, participantId: bob });

    // old sender can no longer remove or delete
    await expect(caller.session.removeItem({ sessionId: session.id, participantId: alice, itemId })).rejects.toThrow();
    await expect(caller.session.destroy({ sessionId: session.id, participantId: alice })).rejects.toThrow();
    // new sender can
    await caller.session.removeItem({ sessionId: session.id, participantId: bob, itemId });
    await caller.session.destroy({ sessionId: session.id, participantId: bob });
  });

  it("rejects role switches from outsiders", async () => {
    const { session } = await caller.session.create();
    await expect(caller.session.switchRole({ sessionId: session.id, participantId: "ghost" })).rejects.toThrow();
  });

  it("lets a lone receiver claim the sender role after the sender leaves (host migration)", async () => {
    const { session, participantId: alice } = await caller.session.create();
    const { participantId: bob } = await caller.session.join({ code: session.code });
    await caller.session.leave({ sessionId: session.id, participantId: alice });

    const { session: updated } = await caller.session.switchRole({ sessionId: session.id, participantId: bob });
    expect(updated.participants.find((p) => p.id === bob)?.role).toBe("sender");
  });
});
