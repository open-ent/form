import { IUserInfo } from "@open-ent/client";

import { getOwnerNameWithUnderscore } from "~/core/utils";

import { IFile, IFilePayload, IResponse, IResponseDTO, IResponsePayload } from "./type";

export const createNewResponse = (
  questionId: number,
  responderId?: string,
  distributionId?: number,
  choiceId?: number,
  answer?: string | Date | number,
  choicePosition?: number,
): IResponse => {
  return {
    id: null,
    questionId: questionId,
    responderId: responderId ? responderId : undefined,
    choiceId: choiceId ? choiceId : undefined,
    answer: answer ? answer : "",
    distributionId: distributionId ? distributionId : undefined,
    originalId: undefined,
    customAnswer: undefined,
    files: [],
    selected: false,
    selectedIndexList: [], // For multiple answer in preview
    choicePosition: choicePosition !== undefined ? choicePosition : undefined, // For question type ranking to order
    image: null, // For question type multiple answer
  };
};

export const transformResponse = (raw: IResponseDTO): IResponse => {
  return {
    id: raw.id,
    questionId: raw.question_id,
    responderId: raw.responder_id,
    choiceId: raw.choice_id,
    answer: raw.answer,
    distributionId: raw.distribution_id,
    originalId: raw.original_id,
    customAnswer: raw.custom_answer,
    files: [],
    selected: false,
    selectedIndexList: [], // For multiple answer in preview
    choicePosition: raw.choice_position, // For question type ranking to order
    image: null, // For question type multiple answer
  };
};

export const transformResponses = (rawResponses: IResponseDTO[]): IResponse[] => {
  return rawResponses.map(transformResponse);
};

export const buildResponsePayload = (response: IResponse, distributionId: number): IResponsePayload => {
  return {
    id: response.id,
    question_id: response.questionId,
    responder_id: response.responderId,
    choice_id: response.choiceId,
    answer: response.answer,
    distribution_id: distributionId,
    original_id: response.originalId,
    custom_answer: response.customAnswer,
    choice_position: response.choicePosition, // For question type ranking to order
    image: response.image, // For question type multiple answer
  };
};

export const buildResponsesPayload = (responses: IResponse[], distributionId: number): IResponsePayload[] => {
  return responses.map((response) => buildResponsePayload(response, distributionId));
};

// RepsonseFile
export const createNewFile = (
  file: File,
  responseId: number | null,
  questionId: number,
  isFormAnonymous: boolean,
  user: IUserInfo | undefined,
): IFile => {
  return {
    formData: formatForSaving(isFormAnonymous, file, user),
    responseId: responseId,
    questionId: questionId,
  };
};

const formatForSaving = (isFormAnonymous: boolean, file: File, user: IUserInfo | undefined): FormData => {
  const filename =
    file.type && !isFormAnonymous
      ? file.name
      : getOwnerNameWithUnderscore(user?.firstName ?? "Anonymous", user?.lastName ?? "Anonymous") + file.name;
  const formData = new FormData();
  formData.append("file", file, filename);
  return formData;
};

export const transformFilePayload = (file: IFile, responseId: number): IFilePayload => {
  return {
    formData: file.formData,
    responseId: responseId,
    questionId: file.questionId,
  };
};
