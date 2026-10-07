import { IUserInfo } from "@open-ent/client";
import { ReactNode } from "react";

import { ModalType } from "~/core/enums";
import { IForm } from "~/core/models/form/types";
import { IQuestionType } from "~/core/models/question/types";
import { ISharedRights, IUserSharedRights, IUserWorkflowRights, IWorkflowRights } from "~/core/rights";

export interface IGlobalProviderProps {
  children: ReactNode;
}

export interface IDisplayModalsState {
  [ModalType.FOLDER_CREATE]: boolean;
  [ModalType.FOLDER_RENAME]: boolean;
  [ModalType.MOVE]: boolean;
  [ModalType.DELETE]: boolean;
  [ModalType.FORM_PROP_CREATE]: boolean;
  [ModalType.FORM_PROP_UPDATE]: boolean;
  [ModalType.FORM_OPEN_BLOCKED]: boolean;
  [ModalType.FORM_SHARE]: boolean;
  [ModalType.FORM_IMPORT]: boolean;
  [ModalType.FORM_EXPORT]: boolean;
  [ModalType.FORM_REMIND]: boolean;
  [ModalType.FORM_ANSWERS]: boolean;
  [ModalType.FORM_ELEMENT_CREATE]: boolean;
  [ModalType.QUESTION_CREATE]: boolean;
  [ModalType.QUESTION_UNDO]: boolean;
  [ModalType.SECTION_UNDO]: boolean;
  [ModalType.QUESTION_DELETE]: boolean;
  [ModalType.SECTION_DELETE]: boolean;
  [ModalType.ORGANIZATION]: boolean;
  [ModalType.FORM_RESULT_PDF]: boolean;
  [ModalType.FORM_RESULT_CSV]: boolean;
  [ModalType.SEND_FORM]: boolean;
  [ModalType.TREE_FORM_UPDATE]: boolean;
}

export type GlobalProviderContextType = {
  displayModals: IDisplayModalsState;
  toggleModal: (modalType: ModalType) => void;
  isMobile: boolean;
  isTablet: boolean;
  selectAllTextInput: (e: React.FocusEvent<HTMLInputElement>) => void;
  initUserWorfklowRights: (user: IUserInfo | undefined, workflowRights: IWorkflowRights) => IUserWorkflowRights;
  initUserSharedRights: (user: IUserInfo | undefined, sharedRights: ISharedRights, form: IForm) => IUserSharedRights;
  questionTypes: IQuestionType[] | undefined;
};
