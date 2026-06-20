import { useEdificeClient } from "@open-ent/react";
import { createContext, FC, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { IFolder } from "~/core/models/folder/types";
import { IForm } from "~/core/models/form/types";
import { IFormElement } from "~/core/models/formElement/types";
import { isQuestion, isSection } from "~/core/models/formElement/utils";
import { IQuestion } from "~/core/models/question/types";
import { ISection } from "~/core/models/section/types";
import { sharingRights, workflowRights } from "~/core/rights";
import { getQuestionRootById, getQuestionSectionById } from "~/hook/dnd-hooks/useCreationDnd/utils";
import { useFormulaireNavigation } from "~/hook/useFormulaireNavigation";
import { useGetFoldersQuery } from "~/services/api/services/formulaireApi/folderApi";
import { useGetFormQuery, useGetMyFormRightsQuery } from "~/services/api/services/formulaireApi/formApi";
import { useGetQuestionsQuery } from "~/services/api/services/formulaireApi/questionApi";
import { useGetSectionsQuery } from "~/services/api/services/formulaireApi/sectionApi";

import { useGlobal } from "../GlobalProvider";
import { useRootFolders } from "../HomeProvider/utils";
import { useFormElementActions } from "./hook/useFormElementActions";
import { useFormElementList } from "./hook/useFormElementsList";
import { CreationProviderContextType, ICreationProviderProps } from "./types";
import { isInFormElementsList, removeFormElementFromList, updateElementInList } from "./utils";

const CreationProviderContext = createContext<CreationProviderContextType | null>(null);

export const useCreation = () => {
  const context = useContext(CreationProviderContext);
  if (!context) {
    throw new Error("useCreation must be used within a CreationProvider");
  }
  return context;
};

export const CreationProvider: FC<ICreationProviderProps> = ({ children }) => {
  const { formId } = useParams();
  const { user } = useEdificeClient();
  const { initUserWorfklowRights, initUserSharedRights } = useGlobal();
  const { navigateToError403 } = useFormulaireNavigation();
  const userWorkflowRights = initUserWorfklowRights(user, workflowRights);
  const rootFolders = useRootFolders();
  const [currentFolder, setCurrentFolder] = useState<IFolder>(rootFolders[0]);
  const [folders, setFolders] = useState<IFolder[]>([]);
  const [form, setForm] = useState<IForm | null>(null);
  const [formElementsList, setFormElementsList] = useState<IFormElement[]>([]);
  const [currentEditingElement, setCurrentEditingElement] = useState<IFormElement | null>(null);
  const [questionModalSection, setQuestionModalSection] = useState<ISection | null>(null);
  const [resetFormElementListId, setResetFormElementListId] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newChoiceValue, setNewChoiceValue] = useState<string>("");
  const [scrollToQuestionId, setScrollToQuestionId] = useState<number | null>(null);
  const [isQuestionSaving, setIsQuestionSaving] = useState(false);
  if (formId === undefined) {
    throw new Error("formId is undefined");
  }

  //DATA
  const { data: foldersDatas } = useGetFoldersQuery(undefined, { skip: !userWorkflowRights.CREATION });
  const { data: formDatas } = useGetFormQuery({ formId }, { skip: !userWorkflowRights.CREATION });
  const { data: formRightsDatas } = useGetMyFormRightsQuery(formId, { skip: !userWorkflowRights.CREATION });
  const { data: questionsDatas, isFetching: isQuestionsFetching } = useGetQuestionsQuery(
    { formId },
    { skip: isUpdating },
  );
  const { data: sectionsDatas, isFetching: isSectionsFetching } = useGetSectionsQuery({ formId }, { skip: isUpdating });

  //CUSTOM HOOKS
  const { completeList } = useFormElementList(
    sectionsDatas,
    questionsDatas,
    isQuestionsFetching || isSectionsFetching || isUpdating || isQuestionSaving,
    resetFormElementListId,
  );
  const { duplicateQuestion, duplicateSection, saveQuestion, saveSection, updateFormElementsList } =
    useFormElementActions(
      formElementsList,
      formId,
      currentEditingElement,
      setFormElementsList,
      setIsUpdating,
      setIsQuestionSaving,
    );

  useEffect(() => {
    if (foldersDatas) {
      setFolders([...rootFolders, ...foldersDatas]);
      return;
    }
    return;
  }, [foldersDatas, rootFolders]);

  useEffect(() => {
    if (formDatas && formRightsDatas && user) {
      setForm(formDatas);

      const form = { ...formDatas, rights: formRightsDatas };
      const userSharedRights = initUserSharedRights(user, sharingRights, form);
      if (!userSharedRights.CONTRIB && !userSharedRights.MANAGE && user.userId !== formDatas.owner_id)
        navigateToError403();
      return;
    }
    return;
  }, [formDatas, formRightsDatas, user]);

  useEffect(() => {
    setFormElementsList(completeList);
  }, [completeList]);

  useEffect(() => {
    if (currentEditingElement && isInFormElementsList(currentEditingElement, formElementsList)) {
      setFormElementsList((prevFormElementList) => updateElementInList(prevFormElementList, currentEditingElement));
    }
    return;
  }, [currentEditingElement]);

  //USER ACTIONS
  const handleUndoQuestionChanges = useCallback(
    (question: IQuestion) => {
      const oldQuestion = !question.sectionId
        ? getQuestionRootById(completeList, question.id)
        : getQuestionSectionById(completeList, question.id);
      if (!oldQuestion) return;
      setFormElementsList((prevFormElementList) => updateElementInList(prevFormElementList, oldQuestion));
      return;
    },
    [completeList],
  );

  const handleUndoSectionChanges = useCallback(
    (section: ISection) => {
      if (!sectionsDatas?.length) return;
      const oldSection = sectionsDatas.find((s) => s.id === section.id);
      if (!oldSection) return;
      setFormElementsList((prevFormElementList) =>
        updateElementInList(prevFormElementList, {
          ...section,
          title: oldSection.title,
          description: oldSection.description,
        } as ISection),
      );
    },
    [sectionsDatas],
  );

  const handleUndoFormElementChange = useCallback(
    (formElement: IFormElement) => {
      if (isQuestion(formElement)) {
        handleUndoQuestionChanges(formElement);
        return;
      }
      if (isSection(formElement)) {
        handleUndoSectionChanges(formElement);
        return;
      }
    },
    [handleUndoQuestionChanges, handleUndoSectionChanges],
  );

  const handleDeleteFormElement = useCallback(
    (toRemove: IFormElement, useKey: boolean = false) => {
      if (!useKey) {
        setFormElementsList((prevFormElementList) => removeFormElementFromList(prevFormElementList, toRemove));
        return;
      }
      setFormElementsList((prevFormElementList) => removeFormElementFromList(prevFormElementList, toRemove, true));
    },
    [setFormElementsList],
  );

  const handleDuplicateFormElement = useCallback(
    async (toDuplicate: IFormElement) => {
      if (!isInFormElementsList(toDuplicate, formElementsList)) return;
      if (isQuestion(toDuplicate)) {
        await duplicateQuestion(toDuplicate);
        return;
      }
      if (isSection(toDuplicate)) {
        await duplicateSection(toDuplicate);
        return;
      }
    },
    [setFormElementsList, formElementsList],
  );

  const value = useMemo<CreationProviderContextType>(
    () => ({
      currentFolder,
      setCurrentFolder,
      folders,
      setFolders,
      form,
      formElementsList,
      setFormElementsList,
      currentEditingElement,
      setCurrentEditingElement,
      handleUndoFormElementChange,
      handleDuplicateFormElement,
      handleDeleteFormElement,
      saveQuestion,
      saveSection,
      questionModalSection,
      setQuestionModalSection,
      updateFormElementsList,
      setResetFormElementListId,
      isDragging,
      setIsDragging,
      newChoiceValue,
      setNewChoiceValue,
      scrollToQuestionId,
      setScrollToQuestionId,
      setIsUpdating,
    }),
    [
      currentFolder,
      folders,
      form,
      formElementsList,
      currentEditingElement,
      questionModalSection,
      isDragging,
      newChoiceValue,
      scrollToQuestionId,
    ],
  );

  return <CreationProviderContext.Provider value={value}>{children}</CreationProviderContext.Provider>;
};
