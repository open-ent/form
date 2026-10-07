import { useEdificeClient } from "@open-ent/react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { createContext, FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { ResponsePageType } from "~/core/enums";
import { DistributionStatus } from "~/core/models/distribution/enums";
import { IDistribution } from "~/core/models/distribution/types";
import { IForm } from "~/core/models/form/types";
import { IFormElement } from "~/core/models/formElement/types";
import { getAllQuestionsAndChildren, getStringifiedFormElementIdType } from "~/core/models/formElement/utils";
import { IResponse } from "~/core/models/response/type";
import { sharingRights, workflowRights } from "~/core/rights";
import { useFormulaireNavigation } from "~/hook/useFormulaireNavigation";
import {
  useAddDistributionMutation,
  useGetDistributionQuery,
  useGetMyFormDistributionsQuery,
} from "~/services/api/services/formulaireApi/distributionApi";
import { useGetFormQuery, useGetMyFormRightsQuery } from "~/services/api/services/formulaireApi/formApi";
import { useGetQuestionsQuery } from "~/services/api/services/formulaireApi/questionApi";
import { useGetDistributionResponsesQuery } from "~/services/api/services/formulaireApi/responseApi";
import { useGetQuestionFilesQuery } from "~/services/api/services/formulaireApi/responseFileApi";
import { useGetSectionsQuery } from "~/services/api/services/formulaireApi/sectionApi";

import { useFormElementList } from "../CreationProvider/hook/useFormElementsList";
import { useGlobal } from "../GlobalProvider";
import { useRespondFormElement } from "./hook/useRespondFormElement";
import { useRespondQuestion } from "./hook/useRespondQuestion";
import { buildProgressObject, getLongestPathsMap } from "./progressBarUtils";
import { IProgressProps, IResponseProviderProps, ResponseMap, ResponseProviderContextType } from "./types";
import { fillResponseMapWithRepsonses, initResponsesMap } from "./utils";

dayjs.extend(isSameOrBefore);

const ResponseProviderContext = createContext<ResponseProviderContextType | null>(null);

export const useResponse = () => {
  const context = useContext(ResponseProviderContext);
  if (!context) {
    throw new Error("useResponse must be used within a ResponseProvider");
  }
  return context;
};

export const ResponseProvider: FC<IResponseProviderProps> = ({ children, previewMode = false, initialPageType }) => {
  const { formId, distributionId } = useParams();
  const { navigateToError403, navigateToError404, navigateToError409, navigateToFormResponse } =
    useFormulaireNavigation();
  const { user } = useEdificeClient();
  const { initUserWorfklowRights, initUserSharedRights } = useGlobal();
  const userWorkflowRights = initUserWorfklowRights(user, workflowRights);
  const [responsesMap, setResponsesMap] = useState<ResponseMap>(new Map());
  const [responses, setResponses] = useState<IResponse[]>([]);
  const [fileIdsToDelete, setFileIdsToDelete] = useState<string[]>([]);
  const { save } = useRespondFormElement(responsesMap, fileIdsToDelete, setFileIdsToDelete, user);
  const [form, setForm] = useState<IForm | null>(null);
  const [distribution, setDistribution] = useState<IDistribution | null>(null);
  const [formElementsList, setFormElementsList] = useState<IFormElement[]>([]);
  const [isInPreviewMode, setIsInPreviewMode] = useState<boolean>(previewMode);
  const [longestPathsMap, setLongestPathsMap] = useState<Map<string, number>>(new Map<string, number>());
  const [progress, setProgress] = useState<IProgressProps>({
    historicFormElementIds: [],
    longuestRemainingPath: 0,
  });
  const [pageType, setPageType] = useState<ResponsePageType | undefined>(initialPageType);
  const [currentElement, setCurrentElement] = useState<IFormElement | null>(null);
  const hasInitializedRsponsesMap = useRef(false);
  const { getQuestionResponses, getQuestionResponse, updateQuestionResponses } = useRespondQuestion(
    responsesMap,
    setResponsesMap,
  );
  const isPageTypeRecap = useMemo(() => pageType === ResponsePageType.RECAP, [pageType]);
  const [scrollToQuestionId, setScrollToQuestionId] = useState<number | null>(null);
  const [addDistribution] = useAddDistributionMutation();

  if (formId === undefined || (!previewMode && distributionId === undefined)) {
    throw new Error("formId or distributionId is undefined");
  }

  // Fetching data
  const { data: formDatas } = useGetFormQuery(
    { formId },
    { skip: previewMode ? !userWorkflowRights.CREATION : !userWorkflowRights.RESPONSE },
  );
  const { data: formRightsDatas } = useGetMyFormRightsQuery(formId);
  const { data: questionsDatas, isFetching: isQuestionsFetching } = useGetQuestionsQuery({ formId });
  const { data: sectionsDatas, isFetching: isSectionsFetching } = useGetSectionsQuery({ formId });
  const { data: distributionData } = useGetDistributionQuery(distributionId ?? "", {
    skip: previewMode || !distributionId || distributionId === "new",
  });
  const { data: formUserDistributionsDatas } = useGetMyFormDistributionsQuery(formId, { skip: previewMode });
  const { data: responsesDatas } = useGetDistributionResponsesQuery(distribution?.id ?? "", {
    skip: previewMode || !distribution?.id,
  });
  const { data: filesDatas } = useGetQuestionFilesQuery(form?.id ?? 0, {
    skip: previewMode || !form?.id,
  });
  const { completeList } = useFormElementList(sectionsDatas, questionsDatas, isQuestionsFetching || isSectionsFetching);

  // Set form value
  useEffect(() => {
    if (formDatas && formRightsDatas && user) {
      setForm(formDatas);

      const form = { ...formDatas, rights: formRightsDatas };
      const userSharedRights = initUserSharedRights(user, sharingRights, form);
      if (previewMode && !userSharedRights.CONTRIB && !userSharedRights.MANAGE && user.userId !== formDatas.owner_id) {
        navigateToError403();
      }

      const today = dayjs();

      const isNotOpened = formDatas.date_opening && dayjs(formDatas.date_opening).isAfter(today, "day");

      const isClosed = formDatas.date_ending && dayjs(formDatas.date_ending).isSameOrBefore(today, "day");

      if (!previewMode && (formDatas.archived || isNotOpened || isClosed)) {
        navigateToError403();
        return;
      }
    }
  }, [formDatas, formRightsDatas, user]);

  // Set distribution value
  useEffect(() => {
    if (previewMode || !formUserDistributionsDatas) return; // Si mode preview, pas de logique de distribution

    // Si on a des data pour le distributionId donné, on utilise directement celles-ci
    if (distributionData) {
      setDistribution(distributionData);
      return;
    }

    // Si distributionId est "new", on tente d'en trouver une existante ou en créer une nouvelle le cas échéant
    if (distributionId === "new") {
      // Si il n'y a pas de distrib ni TODO ni FINISHED, on ne devrait pas être là
      if (formUserDistributionsDatas.length <= 0) {
        navigateToError404();
        return;
      }
      const toDoDistrib = formUserDistributionsDatas.find((d) => d.status == DistributionStatus.TO_DO);
      const finishedDistribs = formUserDistributionsDatas.filter((d) => d.status == DistributionStatus.FINISHED);
      // If form is not multiple and it exists at least one finished distrib => go 409
      if (!form?.multiple && !!finishedDistribs.length) {
        navigateToError409();
        return;
      }
      if ((form && form.multiple) || finishedDistribs.length == 0) {
        // If a TODO distrib exists, we use it
        if (toDoDistrib) {
          setDistribution(toDoDistrib);
          return;
        }
        // Else we create a new one by copying on existing one
        void addDistribution(formUserDistributionsDatas[0].id)
          .unwrap()
          .then((newDistribution) => {
            navigateToFormResponse(formId, newDistribution.id);
          })
          .catch(() => {
            navigateToError403();
          });
      }
    }
  }, [previewMode, distributionId, distributionData, form, distributionData, formUserDistributionsDatas]);

  // Set responses
  useEffect(() => {
    if (!responsesDatas || !filesDatas) return;
    const responsesWithFiles = responsesDatas.map((r) => ({
      ...r,
      files: filesDatas.filter((f) => f.responseId === r.id),
    }));
    setResponses(responsesWithFiles);

    if (!hasInitializedRsponsesMap.current || !formElementsList.length) return;
    const questions = getAllQuestionsAndChildren(formElementsList);
    setResponsesMap((prev) => fillResponseMapWithRepsonses(prev, responsesWithFiles, questions));
  }, [responsesDatas, filesDatas, hasInitializedRsponsesMap.current, formElementsList]);

  // Set page type
  useEffect(() => {
    if (form && (distribution || previewMode)) {
      // Display right page
      if (!initialPageType) {
        if (form.rgpd) {
          setPageType(ResponsePageType.RGPD);
          return;
        }
        if (form.description) {
          setPageType(ResponsePageType.DESCRIPTION);
          return;
        }
        setPageType(ResponsePageType.FORM_ELEMENT);
      }
    }
  }, [form, distribution]);

  useEffect(() => {
    if (!sectionsDatas && !questionsDatas) return;
    setFormElementsList(completeList);
  }, [questionsDatas, sectionsDatas, completeList]);

  // Update progress-bar data
  useEffect(() => {
    if (formElementsList.length <= 0) return;
    const firstElement = formElementsList[0];
    if (!firstElement.id) return;
    const newLongestPathsMap = getLongestPathsMap(formElementsList);
    setLongestPathsMap(newLongestPathsMap);

    updateProgress(firstElement, [], newLongestPathsMap);
  }, [formElementsList]);

  // Initialize responses map and currentElement
  useEffect(() => {
    if (!hasInitializedRsponsesMap.current && formElementsList.length > 0) {
      const initializedResponsesMap = initResponsesMap(formElementsList);
      setResponsesMap(initializedResponsesMap);
      hasInitializedRsponsesMap.current = true;
    }
  }, [formElementsList]);

  const saveResponses = async (currentElement: IFormElement) => {
    if (isInPreviewMode || !distribution?.id || !form) return;
    await save(currentElement, form.anonymous, distribution.id);
  };

  const updateProgress = (
    element: IFormElement,
    newHistoricFormElementIds: number[],
    newLongestPathsMap?: Map<string, number>,
  ) => {
    const feit = getStringifiedFormElementIdType(element);
    if (feit) {
      const longestRemainingPath = newLongestPathsMap ? newLongestPathsMap.get(feit) : longestPathsMap.get(feit);
      if (longestRemainingPath !== undefined) {
        const newProgress = buildProgressObject(newHistoricFormElementIds, longestRemainingPath);
        setProgress(newProgress);
      }
    }
  };

  const value = useMemo<ResponseProviderContextType>(
    () => ({
      form,
      formElementsList,
      isInPreviewMode,
      setIsInPreviewMode,
      progress,
      setProgress,
      updateProgress,
      longestPathsMap,
      pageType,
      setPageType,
      currentElement,
      setCurrentElement,
      saveResponses,
      responsesMap,
      setResponsesMap,
      getQuestionResponses,
      getQuestionResponse,
      updateQuestionResponses,
      distribution,
      responses,
      isPageTypeRecap,
      scrollToQuestionId,
      setScrollToQuestionId,
      fileIdsToDelete,
      setFileIdsToDelete,
    }),
    [
      form,
      formElementsList,
      isInPreviewMode,
      progress,
      updateProgress,
      longestPathsMap,
      pageType,
      setPageType,
      currentElement,
      setCurrentElement,
      saveResponses,
      responsesMap,
      setResponsesMap,
      getQuestionResponses,
      getQuestionResponse,
      updateQuestionResponses,
      distribution,
      responses,
      isPageTypeRecap,
      scrollToQuestionId,
      setScrollToQuestionId,
      fileIdsToDelete,
    ],
  );

  return <ResponseProviderContext.Provider value={value}>{children}</ResponseProviderContext.Provider>;
};
