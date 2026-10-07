import { IUserInfo } from "@open-ent/client";
import { toast } from "react-toastify";

import { t } from "~/i18n";

import { KeyName } from "./enums";
import { IForm } from "./models/form/types";
import { sharingRights } from "./rights";

// KeyDown
export const isEnterPressed = (event: React.KeyboardEvent) => {
  return event.key === (KeyName.ENTER as string);
};

export const isShiftEnterPressed = (event: React.KeyboardEvent) => {
  return event.key === (KeyName.ENTER as string) && event.shiftKey;
};

// Rights

export const hasWorkflow = (user: IUserInfo | undefined, workflowName: string): boolean => {
  if (user === undefined) return false;

  return user.authorizedActions.some((workflowRight) => workflowRight.name === workflowName);
};

export const hasSharedRight = (user: IUserInfo | undefined, sharedRightName: string, form: IForm): boolean => {
  if (user === undefined) return false;

  switch (sharedRightName) {
    case sharingRights.manager:
      return hasSharedRightManager(user, form);
    case sharingRights.contrib:
      return hasSharedRightContrib(user, form);
    case sharingRights.responder:
      return hasSharedRightResponse(user, form);
    default:
      return false;
  }
};

export const hasSharedRightManager = (user: IUserInfo | undefined, form: IForm): boolean => {
  if (user === undefined) return false;
  return form.owner_id === user.userId || form.rights.includes(sharingRights.manager);
};

export const hasSharedRightContrib = (user: IUserInfo | undefined, form: IForm): boolean => {
  if (user === undefined) return false;
  return form.owner_id === user.userId || form.rights.includes(sharingRights.contrib);
};

export const hasSharedRightResponse = (user: IUserInfo | undefined, form: IForm): boolean => {
  if (user === undefined) return false;
  return form.rights.includes(sharingRights.responder);
};

// Others

export const blockProps =
  (...propsToBlock: string[]) =>
  (prop: string) =>
    !propsToBlock.includes(prop);

export const getErrorCode = (err: unknown): number | string | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const e = err as any;
  /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
  return e?.originalStatus && !isNaN(Number(e?.originalStatus))
    ? e?.originalStatus
    : e?.status && !isNaN(Number(e?.status))
    ? e?.status
    : e?.error?.originalStatus && !isNaN(Number(e?.error?.originalStatus))
    ? e?.error?.originalStatus
    : e?.error?.status && !isNaN(Number(e?.error?.status))
    ? e?.error?.status
    : e?.error ?? (err instanceof Error ? err.name : undefined);
};

export const handleErrorApi = (err: unknown, errorMessageKey: string) => {
  const errorCode = getErrorCode(err);
  switch (errorCode) {
    case 401:
    case 403:
    case 404:
      window.location.href = `#/${errorCode}`;
      break;
    default:
      console.error(errorMessageKey, err);
      toast.error(t(errorMessageKey));
  }
};

export const getOwnerNameWithUnderscore = (firstName: string, lastName: string): string => {
  return getOwnerName(firstName, lastName) + "_";
};

export const getOwnerName = (firstName: string, lastName: string): string => {
  return firstName + lastName;
};

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
