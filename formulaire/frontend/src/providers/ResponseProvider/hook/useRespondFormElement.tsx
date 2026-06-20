import { IUserInfo } from "@open-ent/client";
import { Dispatch, SetStateAction } from "react";
import { useDispatch } from "react-redux";

import { TagName } from "~/core/enums";
import { IFormElement } from "~/core/models/formElement/types";
import { getStringifiedFormElementIdType, isSection } from "~/core/models/formElement/utils";
import { QuestionTypes } from "~/core/models/question/enum";
import { IQuestion } from "~/core/models/question/types";
import { IFile, IFilePayload, IResponse } from "~/core/models/response/type";
import {
  buildResponsesPayload,
  createNewFile,
  createNewResponse,
  transformFilePayload,
} from "~/core/models/response/utils";
import { emptySplitFormulaireApi } from "~/services/api/services/formulaireApi/emptySplitFormulaireApi";
import {
  useCreateMultipleMutation,
  useDeleteMultipleByQuestionAndDistributionMutation,
  useUpdateMultipleMutation,
} from "~/services/api/services/formulaireApi/responseApi";
import {
  useCreateResponseFileMutation,
  useDeleteFilesByResponseIdsMutation,
} from "~/services/api/services/formulaireApi/responseFileApi";

import { ResponseMap } from "../types";

export const useRespondFormElement = (
  responsesMap: ResponseMap,
  fileIdsToDelete: string[],
  setFileIdsToDelete: Dispatch<SetStateAction<string[]>>,
  user: IUserInfo | undefined,
) => {
  const dispatch = useDispatch();
  const [createResponses] = useCreateMultipleMutation();
  const [updateResponses] = useUpdateMultipleMutation();
  const [deleteMultipleByQuestionAndDistribution] = useDeleteMultipleByQuestionAndDistributionMutation();
  const [createResponseFile] = useCreateResponseFileMutation();
  const [deleteFilesByIds] = useDeleteFilesByResponseIdsMutation();

  const save = async (currentElement: IFormElement, isFormAnonymous: boolean, distributionId: number) => {
    const formElementIdType = getStringifiedFormElementIdType(currentElement) ?? "";
    const localResponsesMap = responsesMap.get(formElementIdType);
    if (!localResponsesMap) return;

    const responsesToUpdate = [] as IResponse[];
    const responsesToCreate = [] as IResponse[];
    const questionIdsResponseToDelete = [] as number[];
    const responsesFiles = [] as IFile[];

    const questions = isSection(currentElement) ? currentElement.questions : [currentElement as IQuestion];
    questions.forEach((q) => {
      if (q.questionType === QuestionTypes.FILE) {
        if (!q.id) return;
        const response = localResponsesMap.get(q.id)?.[0];
        if (!response) return;
        (response.id ? responsesToUpdate : responsesToCreate).push(response);
        response.files.forEach((f) => {
          if (!f.fileContent) return;
          const file = createNewFile(f.fileContent, response.id, q.id!, isFormAnonymous, user);
          responsesFiles.push(file);
        });
      } else if (q.questionType === QuestionTypes.MATRIX) {
        q.children?.forEach((child) => {
          fillListsByQuestionType(
            child,
            distributionId,
            localResponsesMap,
            responsesToUpdate,
            responsesToCreate,
            questionIdsResponseToDelete,
          );
        });
      } else {
        fillListsByQuestionType(
          q,
          distributionId,
          localResponsesMap,
          responsesToUpdate,
          responsesToCreate,
          questionIdsResponseToDelete,
        );
      }
    });

    // Delete old files
    if (fileIdsToDelete.length) {
      await deleteFilesByIds({ ids: fileIdsToDelete, isFileIds: true });
      setFileIdsToDelete([]);
    }

    // Delete some responses
    if (questionIdsResponseToDelete.length)
      await deleteMultipleByQuestionAndDistribution({ distributionId, questionIds: questionIdsResponseToDelete });

    // Update existing responses
    let updatedResponses = [] as IResponse[];
    if (responsesToUpdate.length) {
      updatedResponses = await updateResponses({
        distributionId,
        responses: buildResponsesPayload(responsesToUpdate, distributionId),
      }).unwrap();
    }

    // Create new responses
    let createdResponses = [] as IResponse[];
    if (responsesToCreate.length) {
      createdResponses = await createResponses({
        distributionId,
        responses: buildResponsesPayload(responsesToCreate, distributionId),
      }).unwrap();
    }

    // Save ResponseFile
    const fetchedResponses = [...updatedResponses, ...createdResponses];
    if (responsesFiles.length > 0) {
      const updatedResponsesFilePayloads = responsesFiles.reduce<IFilePayload[]>((acc, f) => {
        if (f.responseId) {
          acc.push(transformFilePayload(f, f.responseId));
          return acc;
        }
        const responseId = fetchedResponses.find((r) => r.questionId === f.questionId)?.id;
        if (responseId) acc.push(transformFilePayload(f, responseId));
        return acc;
      }, []);
      await saveFiles(updatedResponsesFilePayloads);
    }

    dispatch(emptySplitFormulaireApi.util.invalidateTags([TagName.RESPONSE, TagName.RESPONSE_FILE]));
  };

  const fillListsByQuestionType = (
    question: IQuestion,
    distributionId: number,
    localResponsesMap: Map<number, IResponse[]>,
    responsesToUpdate: IResponse[],
    responsesToCreate: IResponse[],
    questionIdsResponseToDelete: number[],
  ): void => {
    if (!question.id) return;
    const questionResponses = localResponsesMap.get(question.id) ?? [];

    switch (question.questionType) {
      case QuestionTypes.SHORTANSWER:
      case QuestionTypes.LONGANSWER:
      case QuestionTypes.DATE:
      case QuestionTypes.TIME:
      case QuestionTypes.CURSOR:
        questionResponses.forEach((r) => {
          updateOrCreateResponse(r, responsesToUpdate, responsesToCreate); // update or create
        });
        break;
      case QuestionTypes.SINGLEANSWER:
      case QuestionTypes.SINGLEANSWERRADIO:
      case QuestionTypes.MULTIPLEANSWER: {
        questionIdsResponseToDelete.push(question.id); // we want to delete existing response(s)..
        const selectedResponses = questionResponses.filter((r) => r.selected);
        responsesToCreate.push(
          ...(selectedResponses.length > 0
            ? selectedResponses
            : [createNewResponse(question.id, undefined, distributionId)]),
        ); // ..and create new response(s) with the selected one(s)
        break;
      }
      case QuestionTypes.RANKING: {
        questionIdsResponseToDelete.push(question.id); // we want to delete existing responses..
        responsesToCreate.push(...questionResponses); // ..and create new responses
        break;
      }
      default:
        break;
    }
  };

  const updateOrCreateResponse = (
    response: IResponse | null | undefined,
    responsesToUpdate: IResponse[],
    responsesToCreate: IResponse[],
  ): void => {
    if (!response) return;
    if (response.id) responsesToUpdate.push(response);
    else responsesToCreate.push(response);
  };

  const saveFiles = async (filePayloads: IFilePayload[]): Promise<boolean> => {
    try {
      await Promise.all(
        filePayloads.map((payload) =>
          createResponseFile({
            responseId: payload.responseId,
            file: payload.formData,
          }).unwrap(),
        ),
      );

      return true;
    } catch (err) {
      console.log("Error while saving files : ", err);
      return false;
    }
  };

  return { save };
};
