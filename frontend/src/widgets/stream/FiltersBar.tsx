import { Select } from "../../shared/ui/Select";

type StreamSort = "recommended" | "viewers" | "recent";
type StreamFilters = {
  genre?: string;
};

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

      <Select value={sort} onChange={(event) => onChangeSort(event.target.value as StreamSort)}>
        <option value="recommended">Recommended</option>
        <option value="viewers">Viewers</option>
        <option value="recent">Recently started</option>
      </Select>
    </div>
  );
}
