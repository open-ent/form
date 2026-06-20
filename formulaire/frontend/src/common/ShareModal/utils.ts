import { ID, ShareRight, ShareRightAction, ShareRightActionDisplayName } from "@open-ent/client";

import { IUserFormsRight } from "~/providers/ShareModalProvider/types";

export const hasRight = (shareRight: ShareRight, shareAction: ShareRightAction): boolean => {
  return shareRight.actions.filter((a: { id: ShareRightActionDisplayName }) => shareAction.id === a.id).length > 0;
};

export const userHasRight = (
  userFormsRights: IUserFormsRight[],
  formId: number,
  rightId: ShareRightActionDisplayName,
) => {
  const selectedFormRight = userFormsRights.find((item) => item.form.id === formId);

  if (!selectedFormRight) {
    return false;
  }
  return !!selectedFormRight.rights.find((right) => right === rightId);
};

export const showShareRightLine = (shareRight: ShareRight, showBookmarkMembers: boolean): boolean =>
  (shareRight.isBookmarkMember && showBookmarkMembers) || !shareRight.isBookmarkMember;

export const buildPublicLink = (userFormsRights: IUserFormsRight[], resourceId: ID): string | undefined => {
  const formRight = userFormsRights.find(
    (formRight: IUserFormsRight) => formRight.form.id === parseInt(resourceId) && formRight.form.is_public,
  );
  if (!formRight) return undefined;

  const prefix = window.location.origin + "/formulaire-public#/form/";
  return prefix + formRight.form.public_key;
};
