import { Box, SearchInput, TreeView } from "@cgi-learning-hub/ui";
import { DndContext } from "@dnd-kit/core";
import { useEdificeClient } from "@open-ent/react";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Typography, useTheme } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";

import { HomeTabs } from "~/components/HomeTab";
import { OrganizeFilter } from "~/components/OrganizeFilter";
import { IFormChipProps, IMenuItemProps } from "~/components/OrganizeFilter/types";
import { Sidebar } from "~/components/Sidebar";
import { ResourcesEmptyState } from "~/components/SVG/RessourcesEmptyState";
import { FORMULAIRE } from "~/core/constants";
import { ModalType } from "~/core/enums";
import { centerBoxStyle } from "~/core/style/boxStyles";
import { useGlobal } from "~/providers/GlobalProvider";
import { useHome } from "~/providers/HomeProvider";
import { HomeTabState } from "~/providers/HomeProvider/enums";

import { StyledMyAnswerHeaderWrapper, tabStyle } from "../AnswerMainLayout/style";
import { HomeMainFolders } from "../HomeMainFolders";
import { HomeMainForms } from "../HomeMainForms";
import { useSearchAndOrganize } from "../HomeMainLayout/useSearchAndOrganize";
import { formMenuItemDatas, formsChipDatas, getEmptyStateDescription } from "../HomeMainLayout/utils";
import { buildFolderTree } from "../HomeSidebar/utils";
import {
  emptyStateWrapperStyle,
  iconButtonContainerStyle,
  iconButtonStyle,
  mainContentInnerStyle,
  resourceContainerStyle,
  searchBarStyle,
  searchStyle,
  subTextStyle,
  treeViewButtonStyle,
} from "./style";

export const HomeMainLayoutMobile: FC = () => {
  const { folders, forms, currentFolder, tab, sentForms, distributions, toggleTab, handleSelectedItemChange } =
    useHome();
  const { toggleModal } = useGlobal();
  const theme = useTheme();
  const { t } = useTranslation(FORMULAIRE);
  const { user } = useEdificeClient();
  const [selectedChips, setSelectedChips] = useState<IFormChipProps[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<IMenuItemProps>();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const userId = user?.userId;
  const treeViewItems = buildFolderTree(folders);
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

  const handleMenuClick = () => {
    setIsSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <Box sx={mainContentInnerStyle}>
      <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose}>
        <TreeView
          items={treeViewItems}
          maxHeight={"75%"}
          selectedItemId={currentFolder.id.toString()}
          handleSelectedItemChange={handleSelectedItemChange}
        />
      </Sidebar>
      <StyledMyAnswerHeaderWrapper isMobile>
        <Box sx={tabStyle}>
          <HomeTabs value={tab} setValue={toggleTab} />
        </Box>
        <Box sx={treeViewButtonStyle}>
          <Box onClick={handleMenuClick}>
            <ChevronRightRoundedIcon /> {currentFolder.name}
          </Box>
        </Box>
        <Box sx={searchStyle}>
          <OrganizeFilter
            chipDatas={formsChipDatas}
            menuItemDatas={formMenuItemDatas}
            setSelectedChips={setSelectedChips}
            selectedChips={selectedChips}
            setSelectedMenuItem={setSelectedMenuItem}
            selectedMenuItem={selectedMenuItem}
          />
          <SearchInput
            placeholder={t("formulaire.search.placeholder.mobile")}
            sx={searchBarStyle}
            onChange={(event) => {
              handleSearch(event.target.value);
            }}
          />
        </Box>
      </StyledMyAnswerHeaderWrapper>

      {/* DnD not useful here but needed for React to build and display the components DraggableFolder and DraggableForm  */}
      <DndContext>
        {(hasFilteredFolders || hasFilteredForms) && (
          <Box sx={resourceContainerStyle}>
            {hasFilteredFolders && tab === HomeTabState.FORMS && <HomeMainFolders folders={filteredFolders} />}
            {hasFilteredForms && <HomeMainForms forms={filteredForms} />}
          </Box>
        )}
      </DndContext>

      {!hasFilteredFolders && !hasFilteredForms && (
        <Box sx={centerBoxStyle} height="100%">
          <Box sx={emptyStateWrapperStyle}>
            <Box height="25rem">
              <ResourcesEmptyState fill={theme.palette.primary.main} />
            </Box>
            <Typography sx={subTextStyle}>{t(getEmptyStateDescription(currentFolder))}</Typography>
          </Box>
        </Box>
      )}

      <IconButton color="primary" sx={iconButtonStyle}>
        <Box sx={iconButtonContainerStyle}>
          <AddCircleRoundedIcon
            sx={{ fontSize: "54px !important" }}
            onClick={() => {
              toggleModal(ModalType.FORM_PROP_CREATE);
            }}
          />
        </Box>
      </IconButton>
    </Box>
  );
};
