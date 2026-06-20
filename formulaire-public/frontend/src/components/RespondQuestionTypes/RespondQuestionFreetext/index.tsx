import { Box } from "@cgi-learning-hub/ui";
import { Editor } from "@open-ent/react/editor";
import { FC } from "react";

import { EditorMode, EditorVariant } from "~/core/enums";

import { IRespondQuestionTypesProps } from "../types";
import { editorWrapperStyle } from "./style";

export const RespondQuestionFreetext: FC<IRespondQuestionTypesProps> = ({ question }) => {
  return (
    <Box sx={editorWrapperStyle}>
      <Editor content={question.statement} mode={EditorMode.READ} variant={EditorVariant.GHOST} />
    </Box>
  );
};
