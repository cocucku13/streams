import { Select } from "../../shared/ui/Select";
import type { StreamFilters, StreamSort } from "../../types";

type Props = {
  filters: StreamFilters;
  sort: StreamSort;
  onChangeFilters: (filters: StreamFilters) => void;
  onChangeSort: (sort: StreamSort) => void;
};

export function FiltersBar({ filters, sort, onChangeFilters, onChangeSort }: Props) {
  return (
    <div className="filters-bar ui-card">
      <Select value={filters.genre || ""} onChange={(event) => onChangeFilters({ ...filters, genre: event.target.value || undefined })}>
        <option value="">Жанр</option>
        <option value="house">House</option>
        <option value="techno">Techno</option>
        <option value="trance">Trance</option>
      </Select>

      <Select value={filters.city || ""} onChange={(event) => onChangeFilters({ ...filters, city: event.target.value || undefined })}>
        <option value="">Город</option>
        <option value="Москва">Москва</option>
        <option value="Санкт-Петербург">Санкт-Петербург</option>
        <option value="Казань">Казань</option>
      </Select>

      <Select value={filters.latency || ""} onChange={(event) => onChangeFilters({ ...filters, latency: (event.target.value as "low" | "normal") || undefined })}>
        <option value="">Latency</option>
        <option value="low">Low</option>
        <option value="normal">Normal</option>
      </Select>

      <Select value={sort} onChange={(event) => onChangeSort(event.target.value as StreamSort)}>
        <option value="recommended">Recommended</option>
        <option value="viewers">Viewers</option>
        <option value="recent">Recently started</option>
      </Select>
    </div>
  );
}
