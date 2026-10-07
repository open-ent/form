import { useEdificeClient } from "@open-ent/react";
import { useCallback, useMemo } from "react";

import { MANAGER_RIGHT, TRASH_FOLDER_ID } from "~/core/constants";
import { ModalType } from "~/core/enums";
import { getNbFinishedDistrib } from "~/core/models/distribution/utils";
import { IForm } from "~/core/models/form/types";
import { getFormDistributions } from "~/core/models/form/utils";
import { useFormulaireNavigation } from "~/hook/useFormulaireNavigation";
import { t } from "~/i18n";
import { useGlobal } from "~/providers/GlobalProvider";
import { useHome } from "~/providers/HomeProvider";
import { HomeTabState } from "~/providers/HomeProvider/enums";
import { useShareModal } from "~/providers/ShareModalProvider";
import { useGetAllMyDistributionsQuery } from "~/services/api/services/formulaireApi/distributionApi";
import { useDuplicateFormsMutation, useRestoreFormsMutation } from "~/services/api/services/formulaireApi/formApi";

import { ActionBarButtonType } from "./enums";
import { useHandleOpenFormResponse } from "./useHandleOpenFormResponse";

export const useMapActionBarButtons = () => {
  const { navigateToFormEdit, navigateToFormResult } = useFormulaireNavigation();
  const { isTablet, toggleModal } = useGlobal();
  const {
    selectedFolders,
    selectedForms,
    selectedSentForm,
    tab,
    setCurrentFolder,
    setSelectedFolders,
    setSelectedForms,
    setSelectedSentForm,
    folders,
    rootFolders,
    currentFolder,
    forms,
    distributions,
  } = useHome();
  const { user } = useEdificeClient();
  const { userFormsRights } = useShareModal();
  const [duplicateForms, { isLoading: isDuplicating }] = useDuplicateFormsMutation();
  const [restoreForms, { isLoading: isRestoring }] = useRestoreFormsMutation();
  const { data: userDistributions } = useGetAllMyDistributionsQuery();
  const handleOpenFormResponse = useHandleOpenFormResponse();
  const hasNoFolders = useMemo(() => selectedFolders.length === 0, [selectedFolders]);
  const hasOneFolder = useMemo(() => selectedFolders.length === 1, [selectedFolders]);
  const hasMultipleFolders = useMemo(() => selectedFolders.length > 1, [selectedFolders]);
  const hasFolders = useMemo(() => selectedFolders.length > 0, [selectedFolders]);
  const hasQuestionsInForms = useMemo(() => selectedForms.every((form) => form.nb_elements > 0), [selectedForms]);
  const hasShareRightManager = useMemo(() => {
    return selectedForms.every((form) => {
      const formRight = userFormsRights.find((right) => right.form.id === form.id);
      return (formRight ? formRight.rights.includes(MANAGER_RIGHT) : false) || user?.userId === form.owner_id;
    });
  }, [selectedForms, userFormsRights]);

  const hasNoForms = useMemo(() => selectedForms.length === 0, [selectedForms]);
  const hasOneForm = useMemo(() => selectedForms.length === 1, [selectedForms]);
  const hasMultipleForms = useMemo(() => selectedForms.length > 1, [selectedForms]);
  const hasForms = useMemo(() => selectedForms.length > 0, [selectedForms]);
  const hasElements = useMemo(() => {
    return selectedForms.length > 0 && selectedForms.every((form) => form.nb_elements > 0);
  }, [selectedForms]);

  const hasSentForm = useMemo(() => !!selectedSentForm, [selectedSentForm]);

  const hasOnlyFolders = useMemo(() => hasFolders && hasNoForms, [hasFolders, hasNoForms]);
  const hasOnlyForms = useMemo(() => hasForms && hasNoFolders, [hasForms, hasNoFolders]);
  const hasMixedSelection = useMemo(() => hasFolders && hasForms, [hasFolders, hasForms]);
  const isInTrash = useMemo(() => currentFolder.id === TRASH_FOLDER_ID, [currentFolder.id]);
  const hasFormsInTrash = useMemo(() => isInTrash && hasForms, [isInTrash, hasForms]);

  const filteredFolders = useMemo(() => {
    return folders.filter((folder) => folder.parent_id === currentFolder.id);
  }, [folders, currentFolder.id]);

  const filteredForms = useMemo(() => {
    return forms.filter((form) => form.folder_id === currentFolder.id);
  }, [forms, currentFolder.id]);

  const unselectAll = useCallback((): void => {
    if (tab === HomeTabState.FORMS) {
      setSelectedFolders([]);
      setSelectedForms([]);
      return;
    }
    //Response tab
    setSelectedSentForm(null);
    return;
  }, [setSelectedFolders, setSelectedForms]);

  const handleSelectAll = useCallback(() => {
    if (tab === HomeTabState.FORMS) {
      if (hasOnlyFolders) {
        setSelectedFolders(filteredFolders);
        return;
      }
      if (hasOnlyForms) {
        setSelectedForms(filteredForms);
        return;
      }
      setSelectedFolders(filteredFolders);
      setSelectedForms(filteredForms);
      return;
    }
  }, [filteredFolders, filteredForms, hasOnlyFolders, hasOnlyForms, setSelectedFolders, setSelectedForms]);

  const handleDuplicate = useCallback(async () => {
    if (!hasForms || isDuplicating) return;

    try {
      const formIds = selectedForms.map((form) => form.id);
      const targetFolderId = currentFolder.id === rootFolders[1].id ? rootFolders[0].id : currentFolder.id;

      await duplicateForms({
        formIds,
        targetFolderId,
      }).unwrap();
      unselectAll();
      return;
    } catch (error) {
      console.error("Error duplicating forms:", error);
      return;
    }
  }, [hasForms, isDuplicating, selectedForms, currentFolder.id, duplicateForms, unselectAll]);

  const handleRestore = useCallback(async () => {
    if (!hasForms || isRestoring || !isInTrash) return;

    try {
      const formIds = selectedForms.map((form) => form.id);
      await restoreForms(formIds).unwrap();
      unselectAll();
      return;
    } catch (error) {
      console.error("Error restoring forms:", error);
      return;
    }
  }, [hasForms, isRestoring, isInTrash, selectedForms, restoreForms, unselectAll]);

  const openFormResponseAction: (form?: IForm | null) => Promise<void> = async (form = null) => {
    const choosenForm = selectedSentForm ?? form;
    if (!choosenForm || !userDistributions?.length) return;

    await handleOpenFormResponse(choosenForm, userDistributions);
  };

  const ActionBarButtonsMap = useMemo(
    () => ({
      [ActionBarButtonType.OPEN]: {
        label: t("formulaire.open"),
        action: () => {
          if (hasFolders) {
            setCurrentFolder(selectedFolders[0]);
            unselectAll();
            return;
          }
          if (hasForms && tab === HomeTabState.FORMS) {
            if (isTablet) toggleModal(ModalType.FORM_OPEN_BLOCKED);
            else {
              navigateToFormEdit(selectedForms[0].id);
              unselectAll();
            }
          }
          return openFormResponseAction();
        },
      },
      [ActionBarButtonType.RENAME]: {
        label: t("formulaire.rename"),
        action: () => {
          toggleModal(ModalType.FOLDER_RENAME);
        },
      },
      [ActionBarButtonType.MOVE]: {
        label: t("formulaire.move"),
        action: () => {
          toggleModal(ModalType.MOVE);
        },
      },
      [ActionBarButtonType.DELETE]: {
        label: t("formulaire.delete"),
        action: () => {
          toggleModal(ModalType.DELETE);
        },
      },
      [ActionBarButtonType.PROPS]: {
        label: t("formulaire.properties"),
        action: () => {
          toggleModal(ModalType.FORM_PROP_UPDATE);
        },
      },
      [ActionBarButtonType.DUPLICATE]: {
        label: t("formulaire.duplicate"),
        action: () => handleDuplicate(),
      },
      [ActionBarButtonType.EXPORT]: {
        label: t("formulaire.export"),
        action: () => {
          toggleModal(ModalType.FORM_EXPORT);
        },
      },
      [ActionBarButtonType.UNSELECT_ALL]: {
        label: t("formulaire.deselect"),
        action: () => {
          unselectAll();
        },
      },
      [ActionBarButtonType.SELECT_ALL]: {
        label: t("formulaire.selectAll"),
        action: () => {
          handleSelectAll();
        },
      },
      [ActionBarButtonType.RESTORE]: {
        label: t("formulaire.restore"),
        action: () => handleRestore(),
      },
      [ActionBarButtonType.SHARE]: {
        label: t("formulaire.share"),
        action: () => {
          toggleModal(ModalType.FORM_SHARE);
        },
      },
      [ActionBarButtonType.RESULTS]: {
        label: t("formulaire.results"),
        action: () => {
          navigateToFormResult(selectedForms[0].id);
          unselectAll();
        },
      },
      [ActionBarButtonType.REMIND]: {
        label: t("formulaire.checkremind"),
        action: () => {
          toggleModal(ModalType.FORM_REMIND);
        },
      },
      [ActionBarButtonType.MY_ANSWER]: {
        label: t("formulaire.myResponses"),
        action: () => {
          toggleModal(ModalType.FORM_ANSWERS);
        },
      },
    }),
    [
      tab,
      hasFolders,
      hasSentForm,
      selectedFolders,
      userDistributions,
      selectedSentForm,
      setCurrentFolder,
      toggleModal,
      unselectAll,
      handleDuplicate,
      handleSelectAll,
      handleRestore,
    ],
  );

  // Simplification des boutons de droite
  const rightButtons = useMemo(() => {
    if (tab === HomeTabState.RESPONSES) {
      return [];
    }
    return [ActionBarButtonsMap[ActionBarButtonType.UNSELECT_ALL], ActionBarButtonsMap[ActionBarButtonType.SELECT_ALL]];
  }, [ActionBarButtonsMap, tab]);

  // Fonction simplifiée pour obtenir les boutons de gauche
  const leftButtons = useMemo(() => {
    const isCurrentFolderIntoRootFolderMyForms =
      currentFolder.id !== rootFolders[1].id && currentFolder.id !== rootFolders[2].id;
    const getButtonTypes = (): ActionBarButtonType[] => {
      // Cas spécial: Formulaires dans la corbeille
      if (hasFormsInTrash) {
        return [ActionBarButtonType.RESTORE, ActionBarButtonType.DELETE];
      }

      // Cas 1: Un seul formulaire SANS éléments
      if (hasOneForm && !hasFolders && !hasElements) {
        const buttons = [
          ActionBarButtonType.OPEN,
          ActionBarButtonType.PROPS,
          ActionBarButtonType.DUPLICATE,
          ActionBarButtonType.DELETE,
        ];
        if (isCurrentFolderIntoRootFolderMyForms) {
          buttons.splice(3, 0, ActionBarButtonType.MOVE);
        }
        return buttons;
      }
      // Cas 2: Plusieurs formulaires
      if (hasMultipleForms && !hasFolders) {
        const buttons = [ActionBarButtonType.DUPLICATE];
        if (isCurrentFolderIntoRootFolderMyForms) {
          buttons.push(ActionBarButtonType.MOVE);
        }
        if (hasShareRightManager) {
          buttons.push(ActionBarButtonType.EXPORT, ActionBarButtonType.DELETE);
        }
        return buttons;
      }
      // Cas 3: Un seul dossier
      if (hasOneFolder && !hasForms) {
        return [
          ActionBarButtonType.OPEN,
          ActionBarButtonType.RENAME,
          ActionBarButtonType.MOVE,
          ActionBarButtonType.DELETE,
        ];
      }
      // Cas 4: Plusieurs dossiers
      if (hasMultipleFolders && !hasForms) {
        return [ActionBarButtonType.MOVE, ActionBarButtonType.DELETE];
      }
      // Cas 5: Mélange dossiers + formulaires
      if (hasMixedSelection) {
        const buttons = [ActionBarButtonType.MOVE];
        if (hasShareRightManager) {
          buttons.push(ActionBarButtonType.DELETE);
        }
        return buttons;
      }
      //cas 6: Un seul formulaire AVEC des éléments
      if (hasOneForm && !hasFolders && hasElements) {
        const buttons = [
          ActionBarButtonType.OPEN,
          ActionBarButtonType.PROPS,
          ActionBarButtonType.DUPLICATE,
          ActionBarButtonType.RESULTS,
          ActionBarButtonType.REMIND,
        ];
        if (isCurrentFolderIntoRootFolderMyForms) {
          buttons.splice(3, 0, ActionBarButtonType.MOVE);
        }
        if (hasShareRightManager) {
          if (hasQuestionsInForms) {
            const buttonShareIndex = buttons.findIndex((button) => button === ActionBarButtonType.RESULTS);
            buttons.splice(buttonShareIndex, 0, ActionBarButtonType.SHARE);
          }
          buttons.push(ActionBarButtonType.EXPORT, ActionBarButtonType.DELETE);
        }
        return buttons;
      }
      // Cas 7: Un formulaire en réponse
      if (hasSentForm && tab === HomeTabState.RESPONSES) {
        if (
          selectedSentForm?.multiple &&
          getNbFinishedDistrib(getFormDistributions(selectedSentForm, distributions)) > 0
        ) {
          return [ActionBarButtonType.OPEN, ActionBarButtonType.MY_ANSWER];
        }
        return [ActionBarButtonType.OPEN];
      }
      return [];
    };

    const buttonTypes = getButtonTypes();

    return buttonTypes.map((type) => ActionBarButtonsMap[type]);
  }, [
    ActionBarButtonsMap,
    hasOneForm,
    hasMultipleForms,
    hasOneFolder,
    hasMultipleFolders,
    hasFolders,
    hasForms,
    hasMixedSelection,
    hasFormsInTrash,
    tab,
    selectedSentForm,
  ]);

  return { leftButtons, rightButtons, openFormResponseAction, unselectAll };
};
