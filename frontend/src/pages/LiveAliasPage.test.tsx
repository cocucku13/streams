// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, streamApi } from "../api";
import { LiveAliasPage } from "./LiveAliasPage";

function renderPage(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/live/:username" element={<LiveAliasPage />} />
          <Route path="/watch/:streamId" element={<div>watch-target</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("LiveAliasPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects to canonical watch route when active stream is found", async () => {
    vi.spyOn(streamApi, "activeByUsername").mockResolvedValueOnce({
      stream_id: 42,
      owner_username: "dj42",
      is_live: true,
      watch_path: "/watch/42",
      title: "Night Session",
    });

    renderPage("/live/dj42");

    await waitFor(() => {
      expect(screen.getByText("watch-target")).toBeTruthy();
    });
  });

  it("renders unavailable state when no active stream exists", async () => {
    vi.spyOn(streamApi, "activeByUsername").mockRejectedValueOnce(new ApiError(404, "Active stream not found"));

    renderPage("/live/offline-dj");

    await waitFor(() => {
      expect(screen.getByText("Эфир сейчас недоступен")).toBeTruthy();
    });
  });
});
