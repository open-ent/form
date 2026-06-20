import {
  Alert,
  Box,
  Button,
  EllipsisWithTooltip,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@cgi-learning-hub/ui";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Editor } from "@open-ent/react/editor";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FileCopyRoundedIcon from "@mui/icons-material/FileCopyRounded";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CreationQuestionWrapper } from "~/containers/creation/CreationQuestionWrapper";
import { questionAlertStyle, StyledDragContainer } from "~/containers/creation/CreationQuestionWrapper/style";
import { FORMULAIRE, TARGET_RECAP } from "~/core/constants";
import { EditorMode, EditorVariant, ModalType } from "~/core/enums";
import { hasFormResponses } from "~/core/models/form/utils";
import { FormElementType } from "~/core/models/formElement/enum";
import { isValidFormElement } from "~/core/models/formElement/utils";
import { IQuestion } from "~/core/models/question/types";
import { ISection } from "~/core/models/section/types";
import { hasConditionalQuestion } from "~/core/models/section/utils";
import { TEXT_SECONDARY_COLOR } from "~/core/style/colors";
import { AlertSeverityVariant, ComponentVariant, TypographyFontStyle } from "~/core/style/themeProps";
import { DndElementType } from "~/hook/dnd-hooks/useCreationDnd/enum";
import { getDndElementType, updateNextTargetElements } from "~/hook/dnd-hooks/useCreationDnd/utils";
import { useTargetNextElement } from "~/hook/targetNextElement/useTargetNextElement";
import { useCreation } from "~/providers/CreationProvider";
import { useGlobal } from "~/providers/GlobalProvider";

import { StyledEditorWrapper } from "../CreationQuestionTypes/CreationQuestionFreetext/style";
import { IconButtonTooltiped } from "../IconButtonTooltiped/IconButtonTooltiped";
import {
  descriptionStyle,
  nextElementSelectorStyle,
  nextElementSelectorWrapperStyle,
  sectionButtonIconStyle,
  sectionContentStyle,
  sectionDragIconStyle,
  sectionFooterStyle,
  sectionHeaderStyle,
  sectionHeaderWrapperStyle,
  sectionIconWrapperStyle,
  sectionNewQuestionStyle,
  sectionStackStyle,
  sectionTitleStyle,
} from "./style";
import { ICreationSectionProps } from "./types";
import { getDescription, isDescriptionEmpty } from "./utils";

export const CreationSection: FC<ICreationSectionProps> = ({ isPreview, section, listeners, attributes }) => {
  const { t } = useTranslation(FORMULAIRE);
  const {
    form,
    setCurrentEditingElement,
    currentEditingElement,
    handleDuplicateFormElement,
    setQuestionModalSection,
    saveSection,
    formElementsList,
    updateFormElementsList,
    isDragging,
  } = useCreation();
  const { toggleModal } = useGlobal();

  const sortedIds = useMemo(() => section.questions.map((q) => `${getDndElementType(q)}-${q.id}`), [section]);

  const [isUpdatingNextTarget, setIsUpdatingNextTarget] = useState(false);

  const onSaveSectionNextElement = useCallback(
    (updatedSection: ISection, targetElementId: number | undefined, targetElementType: FormElementType | undefined) => {
      void saveSection({
        ...updatedSection,
        nextFormElementId: targetElementId ?? null,
        nextFormElementType: targetElementType ?? null,
        isNextFormElementDefault: false,
      });
    },
    [saveSection],
  );

  const {
    followingElement,
    elementsTwoPositionsAheadList,
    onChange: handleNextFormElementChange,
  } = useTargetNextElement({ entity: section, positionReferenceElement: section, onSave: onSaveSectionNextElement });

  //ACTIONS
  const handleDuplicate = () => {
    void handleDuplicateFormElement(section);
  };

  const handleEdit = () => {
    setCurrentEditingElement(section);
  };

  const handleAddNewQuestion = () => {
    setQuestionModalSection(section);
    toggleModal(ModalType.QUESTION_CREATE);
  };

  const { setNodeRef: setHeaderDroppableNodeRef } = useDroppable({
    id: `${DndElementType.SECTION_TOP}-${section.id}`,
    data: { element: section, dndElementType: DndElementType.SECTION_TOP },
  });

  const { setNodeRef: setFooterDroppableNodeRef } = useDroppable({
    id: `${DndElementType.SECTION_BOTTOM}-${section.id}`,
    data: { element: section, dndElementType: DndElementType.SECTION_BOTTOM },
  });

  useEffect(() => {
    if (
      !isDragging &&
      followingElement &&
      !followingElement.isNew &&
      followingElement.position === formElementsList.length &&
      section.isNextFormElementDefault &&
      !section.nextFormElementId &&
      !hasConditionalQuestion(section)
    ) {
      if (!isUpdatingNextTarget) {
        setIsUpdatingNextTarget(true);
        void updateFormElementsList(updateNextTargetElements(formElementsList), true);
      }
    } else {
      setIsUpdatingNextTarget(false);
    }
  }, [followingElement, formElementsList]);

  return (
    <Box>
      <Stack sx={sectionStackStyle}>
        <Box sx={sectionHeaderWrapperStyle}>
          {!!form && !hasFormResponses(form) && (
            <StyledDragContainer isPreview={!!isPreview} ref={setHeaderDroppableNodeRef} {...listeners} {...attributes}>
              <DragIndicatorRoundedIcon sx={sectionDragIconStyle} />
            </StyledDragContainer>
          )}
          <Box sx={sectionHeaderStyle} mt={!form || hasFormResponses(form) ? 2 : 0}>
            <Box sx={sectionTitleStyle}>
              <EllipsisWithTooltip>
                {section.title ? section.title : t("formulaire.section.title.empty")}
              </EllipsisWithTooltip>
            </Box>
            {currentEditingElement === null && (
              <Box sx={sectionIconWrapperStyle}>
                <IconButtonTooltiped
                  icon={<FileCopyRoundedIcon sx={sectionButtonIconStyle} />}
                  onClick={handleDuplicate}
                  tooltipI18nKey={"formulaire.duplicate"}
                  ariaLabel="duplicate"
                  disabled={!!form && hasFormResponses(form)}
                  slotProps={{ iconButton: sectionButtonIconStyle }}
                />
                <IconButtonTooltiped
                  icon={<EditRoundedIcon sx={sectionButtonIconStyle} />}
                  onClick={handleEdit}
                  tooltipI18nKey={"formulaire.edit"}
                  ariaLabel="edit"
                  slotProps={{ iconButton: sectionButtonIconStyle }}
                />
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={sectionContentStyle}>
          <Box sx={descriptionStyle}>
            <StyledEditorWrapper
              isCurrentEditingElement={true}
              sx={{
                ...(isDescriptionEmpty(section)
                  ? { fontStyle: TypographyFontStyle.ITALIC, color: TEXT_SECONDARY_COLOR }
                  : {}),
              }}
            >
              <Editor content={getDescription(section)} mode={EditorMode.READ} variant={EditorVariant.GHOST} />
            </StyledEditorWrapper>
          </Box>
          <Box>
            <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
              {section.questions.map((question: IQuestion) => (
                <CreationQuestionWrapper key={question.id} question={question} isRoot={false} />
              ))}
            </SortableContext>
          </Box>
          <Box ref={setFooterDroppableNodeRef} sx={sectionFooterStyle}>
            <Box sx={nextElementSelectorWrapperStyle}>
              {!hasConditionalQuestion(section) && (
                <FormControl fullWidth>
                  <Select
                    variant={ComponentVariant.OUTLINED}
                    value={
                      section.nextFormElementId != null && followingElement
                        ? String(section.nextFormElementId)
                        : TARGET_RECAP
                    }
                    onChange={handleNextFormElementChange}
                    displayEmpty
                    MenuProps={{
                      PaperProps: {
                        sx: nextElementSelectorStyle,
                      },
                    }}
                    disabled={!form || hasFormResponses(form)}
                  >
                    {followingElement && (
                      <MenuItem value={followingElement.id != null ? String(followingElement.id) : ""}>
                        <EllipsisWithTooltip>{t("formulaire.access.next")}</EllipsisWithTooltip>
                      </MenuItem>
                    )}

                    {elementsTwoPositionsAheadList.map((el) => (
                      <MenuItem key={el.id} value={el.id != null ? String(el.id) : ""}>
                        <EllipsisWithTooltip> {t("formulaire.access.element") + (el.title ?? "")}</EllipsisWithTooltip>
                      </MenuItem>
                    ))}

                    <MenuItem value={TARGET_RECAP}>
                      <EllipsisWithTooltip> {t("formulaire.access.recap")}</EllipsisWithTooltip>
                    </MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
            <Box sx={sectionNewQuestionStyle}>
              {!!form && !hasFormResponses(form) && (
                <Button variant="text" onClick={handleAddNewQuestion}>
                  <Typography color="secondary">{t("formulaire.section.new.question")}</Typography>
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Stack>
      {!isValidFormElement(section) && (
        <Alert
          severity={AlertSeverityVariant.WARNING}
          title={t("formulaire.section.missing.field")}
          children={t("formulaire.section.missing.field.title")}
          sx={questionAlertStyle}
        />
      )}
    </Box>
  );
};
