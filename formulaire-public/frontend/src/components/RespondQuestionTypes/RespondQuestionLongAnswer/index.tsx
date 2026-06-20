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
  const [answer, setAnswer] = useState<string>("");
  const associatedResponse = getQuestionResponse(question);
  const currentAnswer = useRef<string>(typeof associatedResponse?.answer === "string" ? associatedResponse.answer : "");

  useEffect(() => {
    const associatedResponse = getQuestionResponse(question);
    if (!associatedResponse) return;
    const existingAnswer = associatedResponse.answer;
    if (typeof existingAnswer === "string") {
      setAnswer(existingAnswer);
      currentAnswer.current = existingAnswer;
    }
  }, [question, getQuestionResponse]);

  const handleResponseChange = () => {
    const associatedResponse = getQuestionResponse(question);
    if (!question.id || !associatedResponse) return;
    const value = editorRef.current?.getContent(EDITOR_CONTENT_HTML) as string;
    setAnswer(value);
    associatedResponse.answer = value;
    updateQuestionResponses(question, [associatedResponse]);
  };

  return isPageTypeRecap && !answer ? (
    <Typography fontStyle={"italic"}>{t("formulaire.public.response.missing")}</Typography>
  ) : (
    <Box sx={{ ...(!isPageTypeRecap && respondQuestionLongAnswerStyle) }}>
      <Editor
        onContentChange={handleResponseChange}
        content={isPageTypeRecap ? answer : currentAnswer.current}
        ref={editorRef}
        mode={isPageTypeRecap ? EditorMode.READ : EditorMode.EDIT}
        variant={isPageTypeRecap ? EditorVariant.GHOST : EditorVariant.OUTLINE}
        focus={false}
      />
    </Box>
  );
};
