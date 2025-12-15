import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";

function ShortenerForm() {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("loading");
    try {
      const res = await fetch("http://localhost:5000/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
        body: JSON.stringify({ longUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "fail");
      setMsg(`ok:${data.shortCode}`);
    } catch (err) {
      setMsg("error");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="url">URL</label>
      <input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button type="submit">Shorten</button>
      <div data-testid="msg">{msg}</div>
    </form>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Frontend (example) - ShortenerForm", () => {
  it("render: are input + buton", () => {
    render(<ShortenerForm />);
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shorten/i })).toBeInTheDocument();
  });

  it("submit ok: cheamă backend și afișează shortCode", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ shortCode: "abc123" }),
    })));

    render(<ShortenerForm />);
    await userEvent.type(screen.getByLabelText("URL"), "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: /shorten/i }));

    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.getByTestId("msg")).toHaveTextContent("ok:abc123");
  });

  it("submit fail: afișează error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "Bad URL" }),
    })));

    render(<ShortenerForm />);
    await userEvent.type(screen.getByLabelText("URL"), "notaurl");
    await userEvent.click(screen.getByRole("button", { name: /shorten/i }));

    expect(screen.getByTestId("msg")).toHaveTextContent("error");
  });
});
