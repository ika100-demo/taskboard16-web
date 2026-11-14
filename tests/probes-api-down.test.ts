import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as health } from "@/app/api/health/route";
import { GET as ready } from "@/app/api/ready/route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("probes while the Task API is down", () => {
  it("AC-001.8 /api/health and /api/ready answer 200 without calling the Task API", async () => {
    process.env.API_URL = "http://api.test";
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    const h = await health();
    const r = await ready();
    expect(h.status).toBe(200);
    expect(await h.json()).toEqual({ status: "ok" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: "ready" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
