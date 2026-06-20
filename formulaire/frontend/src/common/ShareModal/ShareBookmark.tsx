import { Box } from "@cgi-learning-hub/ui";
import { Button, FormControl } from "@open-ent/react";
import { IconSave } from "@open-ent/react/icons";
import { Ref } from "react";
import { useTranslation } from "react-i18next";

import { COMMON } from "~/core/constants";

import { BookmarkProps } from "./hooks/useShareBookmark";
export const ShareBookmark = ({
  bookmark,
  refBookmark,
  onBookmarkChange,
  onSave,
}: {
  bookmark: BookmarkProps;
  refBookmark: Ref<HTMLInputElement>;
  onBookmarkChange: () => void;
  onSave: () => void;
}) => {
  const { t } = useTranslation(COMMON);

  return (
    <Box className="mt-16">
      <FormControl id="bookmarkName" className="d-flex flex-wrap align-items-center gap-16">
        <Box className="flex-fill">
          <FormControl.Input
            key={bookmark.id}
            ref={refBookmark}
            onChange={onBookmarkChange}
            placeholder={t("explorer.modal.share.sharebookmark.placeholder")}
            size="sm"
            type="text"
          />
        </Box>
        <Button
          type="button"
          color="primary"
          variant="ghost"
          disabled={bookmark.name.length === 0}
          leftIcon={<IconSave />}
          onClick={onSave}
          className="text-nowrap"
        >
          {t("explorer.modal.share.sharebookmark.save")}
        </Button>
      </FormControl>
    </Box>
  );
};
