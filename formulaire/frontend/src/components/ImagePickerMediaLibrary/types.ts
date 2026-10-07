import { WorkspaceElement } from "@open-ent/client";

import { PROTECTED_VISIBILITY, PUBLIC_VISIBILITY } from "~/core/constants";

export type ImageVisibility = typeof PUBLIC_VISIBILITY | typeof PROTECTED_VISIBILITY;

export interface IImagePickerMediaLibraryProps {
  information?: string;
  onImageChange?: (src: string | null) => void;
  width?: string;
  height?: string;
  initialSrc?: string;
  isMobile?: boolean;
  visibility?: ImageVisibility;
}

export interface IContainerProps {
  isMobile?: boolean;
}

export type MediaLibraryResult = WorkspaceElement[] | WorkspaceElement;
