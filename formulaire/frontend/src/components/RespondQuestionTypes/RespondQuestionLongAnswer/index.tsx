import { Box, Typography } from "@cgi-learning-hub/ui";
import { Editor, EditorRef } from "@open-ent/react/editor";
import { FC, useEffect, useRef, useState } from "react";

import { EDITOR_CONTENT_HTML } from "~/core/constants";
import { EditorMode, EditorVariant } from "~/core/enums";
import { t } from "~/i18n";
import { useResponse } from "~/providers/ResponseProvider";

import { IRespondQuestionTypesProps } from "../types";
import { respondQuestionLongAnswerStyle } from "./style";

export const RespondQuestionLongAnswer: FC<IRespondQuestionTypesProps> = ({ question }) => {
  const editorRef = useRef<EditorRef>(null);
  const { getQuestionResponse, updateQuestionResponses, isPageTypeRecap } = useResponse();
  const [initialAnswer, setInitialAnswer] = useState<string>("");
  const initialized = useRef(false);

  useEffect(() => {
    initialized.current = false;
  }, [question]);

  useEffect(() => {
    if (initialized.current) return;
    const associatedResponse = getQuestionResponse(question);
    if (!associatedResponse) return;
    const existingAnswer = associatedResponse.answer;
    if (typeof existingAnswer === "string" && existingAnswer != initialAnswer) {
      setInitialAnswer(existingAnswer);
      initialized.current = true;
    }
  }, [question, getQuestionResponse]);

  const handleResponseChange = () => {
    const associatedResponse = getQuestionResponse(question);
    if (!question.id || !associatedResponse) return;
    const value = editorRef.current?.getContent(EDITOR_CONTENT_HTML) as string;
    associatedResponse.answer = value;
    updateQuestionResponses(question, [associatedResponse]);
  };

  return isPageTypeRecap && !initialAnswer ? (
    <Typography fontStyle={"italic"}>{t("formulaire.response.missing")}</Typography>
  ) : (
    <Box sx={{ ...(!isPageTypeRecap && respondQuestionLongAnswerStyle) }}>
      <Editor
        onContentChange={handleResponseChange}
        content={initialAnswer}
        ref={editorRef}
        mode={isPageTypeRecap ? EditorMode.READ : EditorMode.EDIT}
        variant={isPageTypeRecap ? EditorVariant.GHOST : EditorVariant.OUTLINE}
        focus={false}
      />
    </Box>
  );
};
