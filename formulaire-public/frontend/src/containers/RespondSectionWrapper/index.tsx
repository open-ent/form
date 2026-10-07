import { Box, Stack, Typography } from "@cgi-learning-hub/ui";
import { Editor } from "@open-ent/react/editor";
import { FC } from "react";

import { EditorMode, EditorVariant } from "~/core/enums";
import { COMMON_WHITE_COLOR } from "~/core/style/colors";

import { RespondQuestionWrapper } from "../RespondQuestionWrapper";
import { descriptionStyle, sectionContentStyle, sectionHeaderWrapperStyle, sectionStackStyle } from "./style";
import { IRespondSectionWrapperProps } from "./types";

export const RespondSectionWrapper: FC<IRespondSectionWrapperProps> = ({ section }) => {
  return (
    <Stack sx={sectionStackStyle}>
      <Box sx={sectionHeaderWrapperStyle}>
        <Typography color={COMMON_WHITE_COLOR}>{section.title}</Typography>
      </Box>
      <Box sx={sectionContentStyle}>
        <Box sx={descriptionStyle}>
          <Editor content={section.description} mode={EditorMode.READ} variant={EditorVariant.GHOST} />
        </Box>
        <Stack>
          {section.questions.map((question) => {
            return <RespondQuestionWrapper key={question.id} question={question} />;
          })}
        </Stack>
      </Box>
    </Stack>
  );
};
