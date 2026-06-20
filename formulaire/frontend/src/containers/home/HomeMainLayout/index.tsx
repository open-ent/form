import { Box, SearchInput } from "@cgi-learning-hub/ui";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useEdificeClient } from "@open-ent/react";
import FolderIcon from "@mui/icons-material/Folder";
import { Typography, useTheme } from "@mui/material";
import { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormBreadcrumbs } from "~/components/Breadcrumbs";
import { DroppableTreeItem } from "~/components/DroppableTreeItem";
import { FolderPreview } from "~/components/FolderPreview";
import { FormPreview } from "~/components/FormPreview";
import { OrganizeFilter } from "~/components/OrganizeFilter";
import { IFormChipProps, IMenuItemProps } from "~/components/OrganizeFilter/types";
import { ResourcesEmptyState } from "~/components/SVG/RessourcesEmptyState";
import { SwitchView } from "~/components/SwitchView";
import { ViewMode } from "~/components/SwitchView/enums";
import { IToggleButtonItem } from "~/components/SwitchView/types";
import { FORMULAIRE } from "~/core/constants";
import { centerBoxStyle } from "~/core/style/boxStyles";
import { useFormFolderDnd } from "~/hook/dnd-hooks/useFormFolderDnd";
import { isDraggedItemFolder, isDraggedItemForm } from "~/hook/dnd-hooks/utils";
import { useHome } from "~/providers/HomeProvider";
import { HomeTabState } from "~/providers/HomeProvider/enums";

import { HomeMainFolders } from "../HomeMainFolders";
import { HomeMainForms } from "../HomeMainForms";
import { HomeMainFormsTable } from "../HomeMainFormsTable";
import { buildFlatFolderTree } from "../HomeSidebar/utils";
import {
  emptyStateWrapperStyle,
  resourceContainerStyle,
  searchBarStyle,
  searchStyle,
  StyledMainContentInnerWrapper,
  viewTitleStyle,
} from "./style";
import { useSearchAndOrganize } from "./useSearchAndOrganize";
import {
  formMenuItemDatas,
  formsChipDatas,
  getDragCursorStyle,
  getEmptyStateDescription,
  useToggleButtons,
} from "./utils";

export const HomeMainLayout: FC = () => {
  const {
    folders,
    forms,
    currentFolder,
    selectedFolders,
    selectedForms,
    tab,
    tabViewPref,
    sentForms,
    distributions,
    setSelectedFolders,
    setSelectedForms,
    toggleTagViewPref,
  } = useHome();
  const theme = useTheme();
  const { t } = useTranslation(FORMULAIRE);
  const { user } = useEdificeClient();
  const [selectedChips, setSelectedChips] = useState<IFormChipProps[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<IMenuItemProps>();
  const userId = user?.userId;
  const { handleDragStart, handleDragOver, handleDragEnd, handleDragCancel, sensors, activeDragItem, isValidDrop } =
    useFormFolderDnd(selectedFolders, selectedForms, setSelectedFolders, setSelectedForms, currentFolder);
  const viewMode = tabViewPref[tab];

  const flatTreeViewItems = buildFlatFolderTree(folders);
  const treeRoot = document.querySelector("[data-treeview-root='true']");

  const { handleSearch, filteredFolders, hasFilteredFolders, filteredForms, hasFilteredForms } = useSearchAndOrganize(
    folders,
    forms,
    currentFolder,
    userId,
    selectedChips,
    sentForms,
    distributions,
    tab,
    selectedMenuItem,
  );

  const toggleButtonList: IToggleButtonItem[] = useToggleButtons();

  const breadcrumbsTexts = useMemo(() => (currentFolder.name ? [currentFolder.name] : []), [currentFolder.name]);

  return (
    <StyledMainContentInnerWrapper nbChildrenToMargin={2} sx={{ ...getDragCursorStyle(activeDragItem, isValidDrop) }}>
      <Box sx={searchStyle}>
        <SearchInput
          placeholder={t("formulaire.search.placeholder")}
          sx={searchBarStyle}
          onChange={(event) => {
            handleSearch(event.target.value);
          }}
        />
        <OrganizeFilter
          chipDatas={formsChipDatas}
          menuItemDatas={formMenuItemDatas}
          setSelectedChips={setSelectedChips}
          selectedChips={selectedChips}
          setSelectedMenuItem={setSelectedMenuItem}
          selectedMenuItem={selectedMenuItem}
        />
      </Box>
      <Box sx={viewTitleStyle}>
        <FormBreadcrumbs icon={currentFolder.icon ?? FolderIcon} items={breadcrumbsTexts} />
        <SwitchView viewMode={viewMode} toggleButtonList={toggleButtonList} onChange={toggleTagViewPref} />
      </Box>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {(hasFilteredFolders || hasFilteredForms) && (
          <Box sx={resourceContainerStyle}>
            {hasFilteredFolders && tab === HomeTabState.FORMS && (
              <HomeMainFolders folders={filteredFolders} activeItem={activeDragItem} />
            )}
            {hasFilteredForms &&
              (viewMode === ViewMode.CARDS ? (
                <HomeMainForms forms={filteredForms} activeItem={activeDragItem} />
              ) : (
                <HomeMainFormsTable forms={filteredForms} />
              ))}
          </Box>
        )}
        {/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */}
        <Box>
          {flatTreeViewItems.map((item) => (
            <DroppableTreeItem
              key={item.internalId}
              treeItemId={parseInt(item.internalId)}
              treeRootRect={treeRoot?.getBoundingClientRect()}
            />
          ))}
        </Box>
        {/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */}
        <DragOverlay>
          {isDraggedItemForm(activeDragItem) && activeDragItem.form ? (
            <FormPreview form={activeDragItem.form} />
          ) : isDraggedItemFolder(activeDragItem) && activeDragItem.folder ? (
            <FolderPreview folder={activeDragItem.folder} />
          ) : null}
        </DragOverlay>
        {!hasFilteredFolders && !hasFilteredForms && (
          <Box sx={centerBoxStyle} height="100%">
            <Box sx={emptyStateWrapperStyle}>
              <Box height="25rem">
                <ResourcesEmptyState fill={theme.palette.primary.main} />
              </Box>
              <Typography>{t(getEmptyStateDescription(currentFolder))}</Typography>
            </Box>
          </Box>
        )}
      </DndContext>
    </StyledMainContentInnerWrapper>
  );
};
