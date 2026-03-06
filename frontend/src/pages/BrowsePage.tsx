import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { browseApi } from "../api";
import { Button } from "../shared/ui/Button";
import { FiltersBar } from "../widgets/stream/FiltersBar";
import { StreamGrid } from "../widgets/stream/StreamGrid";
import type { StreamFilters, StreamSort } from "../types";

export function BrowsePage() {
  const [filters, setFilters] = useState<StreamFilters>({});
  const [sort, setSort] = useState<StreamSort>("recommended");

  const { data, isLoading, error } = useQuery({
    queryKey: ["browse-streams", filters, sort],
    queryFn: () => browseApi.streams(filters, sort),
  });

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="hero-content">
          <p className="hero-kicker">DJ Streams</p>
          <h1>LIVE DJ STREAMS</h1>
          <p className="hero-subtitle">Смотри лайвы диджеев и узнай, что играет в клубе до того, как туда пойти.</p>
          <div className="hero-actions">
            <Link to="#live-grid">
              <Button>Смотреть эфиры</Button>
            </Link>
            <Link to="/dashboard/stream">
              <Button variant="ghost">Стать диджеем</Button>
            </Link>
          </div>
        </div>
        <div className="hero-stat">
          <Radio size={18} />
          <strong>{data?.length || 0}</strong>
          <span>live сетов</span>
        </div>
      </div>

      <FiltersBar filters={filters} sort={sort} onChangeFilters={setFilters} onChangeSort={setSort} />

      {error && <p className="error">Не удалось загрузить эфиры. Обновите страницу.</p>}
      <div id="live-grid">
        <StreamGrid streams={data || []} loading={isLoading} />
      </div>
    </section>
  );
}
