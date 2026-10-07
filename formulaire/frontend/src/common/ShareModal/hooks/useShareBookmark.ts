import { odeServices, ShareRightWithVisibles } from "@open-ent/client";
import { useToggle } from "@open-ent/react";
import { Dispatch, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { COMMON } from "~/core/constants";

import { ShareAction } from "./useShare";

interface IUseShareBookmarkProps {
  shareRights: ShareRightWithVisibles;
  shareDispatch: Dispatch<ShareAction>;
}

export type BookmarkProps = {
  name: string;
  id: string;
};

export const useShareBookmark = ({ shareRights, shareDispatch }: IUseShareBookmarkProps) => {
  const { t } = useTranslation(COMMON);

  const refBookmark = useRef<HTMLInputElement>(null);

  const [bookmark, setBookmark] = useState<BookmarkProps>({
    name: "",
    id: useId(),
  });
  const [showBookmark, setShowBookmark] = useToggle(false) as [boolean, () => void];
  const [showBookmarkInput, toggleBookmarkInput] = useState<boolean>(false);

  const toggleBookmark = () => {
    setShowBookmark();
  };

  const handleBookmarkChange = () => {
    setBookmark((prev) => ({
      ...prev,
      name: refBookmark.current?.value || "",
    }));
  };

  const saveBookmark = async (name: string) => {
    try {
      const res = await odeServices.directory().saveBookmarks(name, {
        users: shareRights.rights
          .filter((right: { type: string }) => right.type === "user")
          .map((u: { id: string }) => u.id),
        groups: shareRights.rights
          .filter((right: { type: string }) => right.type === "group")
          .map((u: { id: string }) => u.id),
        bookmarks: shareRights.rights
          .filter((right: { type: string }) => right.type === "sharebookmark")
          .map((u: { id: string }) => u.id),
      });

      toast.success(t("explorer.bookmarked.status.saved"));

      shareDispatch({
        type: "updateShareRights",
        payload: {
          ...shareRights,
          visibleBookmarks: [
            ...shareRights.visibleBookmarks,
            {
              displayName: name,
              id: res.id,
            },
          ],
        },
      });

      setBookmark((prev) => ({
        ...prev,
        bookmarkId: prev.id + new Date().getTime().toString(),
      }));
      toggleBookmarkInput(false);
    } catch (e) {
      console.error("Failed to save bookmark", e);
      toast.error(t("explorer.bookmarked.status.error"));
    }
  };

  const handleOnSave = () => {
    const inputValue = refBookmark.current?.value || "";
    void saveBookmark(inputValue);
  };

  return {
    refBookmark,
    showBookmark,
    showBookmarkInput,
    bookmark,
    handleBookmarkChange,
    setBookmark,
    handleOnSave,
    toggleBookmark,
    toggleBookmarkInput,
  };
};
