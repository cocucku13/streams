import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { streamApi } from "../../api";
import type { ClubListItem, StreamPatchPayload, StreamWithMeta } from "../../types";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Modal } from "../../shared/ui/Modal";
import { Select } from "../../shared/ui/Select";
import { Textarea } from "../../shared/ui/Textarea";

type Props = {
  open: boolean;
  onClose: () => void;
  stream: StreamWithMeta;
  canEditClub: boolean;
  clubs: ClubListItem[];
  canManage: boolean;
  streamIdKey: number;
};

export function EditStreamSettingsModal({ open, onClose, stream, canEditClub, clubs, canManage, streamIdKey }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: StreamPatchPayload) => streamApi.patchById(stream.id, payload),
    onMutate: async (payload) => {
      const key = ["stream-by-id", streamIdKey];
      const previous = queryClient.getQueryData<StreamWithMeta | null>(key);

      if (previous) {
        queryClient.setQueryData<StreamWithMeta>(key, {
          ...previous,
          title: payload.title,
          description: payload.description,
          genre: payload.genre,
          current_track: payload.current_track,
          club_id: payload.club_id,
          club_title: payload.club_id ? clubs.find((club) => club.id === payload.club_id)?.title || null : null,
          club_slug: payload.club_id ? clubs.find((club) => club.id === payload.club_id)?.slug || null : null,
          visibility: payload.visibility,
        });
      }

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["stream-by-id", streamIdKey], context.previous);
      }
      toast.error("Не удалось сохранить настройки стрима");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stream-by-id", streamIdKey] }),
        queryClient.invalidateQueries({ queryKey: ["browse-discover"] }),
        queryClient.invalidateQueries({ queryKey: ["directory-category-streams"] }),
      ]);
      toast.success("Сохранено");
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Настройки стрима"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="stream-settings-form" disabled={!canManage || mutation.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form
        id="stream-settings-form"
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canManage) {
            return;
          }

          const formData = new FormData(event.currentTarget);
          const selectedClub = String(formData.get("club") || "");
          mutation.mutate({
            title: String(formData.get("title") || ""),
            genre: String(formData.get("genre") || ""),
            current_track: String(formData.get("current_track") || ""),
            description: String(formData.get("description") || ""),
            visibility: String(formData.get("visibility") || "public") as "public" | "unlisted",
            club_id: selectedClub ? Number(selectedClub) : null,
          });
        }}
      >
        <label>
          Title
          <Input name="title" defaultValue={stream.title} disabled={!canManage} />
        </label>
        <label>
          Genre
          <Input name="genre" defaultValue={stream.genre} disabled={!canManage} />
        </label>
        <label>
          Club
          <Select name="club" defaultValue={String(stream.club_id ?? "")} disabled={!canEditClub}>
            <option value="">Личный стрим</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.title}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Now Playing
          <Input name="current_track" defaultValue={stream.current_track} disabled={!canManage} />
        </label>
        <label>
          Description
          <Textarea name="description" rows={4} defaultValue={stream.description} disabled={!canManage} />
        </label>
        <label>
          Visibility
          <Select name="visibility" defaultValue={stream.visibility || "public"} disabled={!canManage}>
            <option value="public">public</option>
            <option value="unlisted">unlisted</option>
          </Select>
        </label>
      </form>
    </Modal>
  );
}
