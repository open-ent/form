import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@cgi-learning-hub/ui";
import { useEdificeClient } from "@open-ent/react";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { FORMULAIRE } from "~/core/constants";
import { FRONT_ROUTES } from "~/core/frontRoutes";
import { DistributionStatus } from "~/core/models/distribution/enums";
import { getAllQuestionsAndChildren } from "~/core/models/formElement/utils";
import { buildResponsesPayload } from "~/core/models/response/utils";
import { TEXT_PRIMARY_COLOR } from "~/core/style/colors";
import { BreakpointVariant, ComponentVariant, TypographyFontStyle, TypographyVariant } from "~/core/style/themeProps";
import { isEnterPressed } from "~/core/utils";
import { preventPropagation } from "~/providers/CreationProvider/utils";
import { useResponse } from "~/providers/ResponseProvider";
import {
  useReplaceDistributionMutation,
  useUpdateDistributionMutation,
} from "~/services/api/services/formulaireApi/distributionApi";
import { useDeleteResponsesMutation } from "~/services/api/services/formulaireApi/responseApi";

import { ISendFormModalProps } from "./types";

export const SendFormModal: FC<ISendFormModalProps> = ({ isOpen, handleClose, distribution }) => {
  const { t } = useTranslation(FORMULAIRE);
  const { user } = useEdificeClient();
  const { formElementsList, progress, responses } = useResponse();
  const [updateDistribution] = useUpdateDistributionMutation();
  const [replaceDistribution] = useReplaceDistributionMutation();
  const [deleteResponses] = useDeleteResponsesMutation();
  const [selectedStructure, setSelectedStructure] = useState<string>("");

  useEffect(() => {
    if (user && user.structures.length && user.structures.length === user.structureNames.length)
      setSelectedStructure(user.structures[0]);
  }, [user]);

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedStructure(event.target.value);
  };

  const send = async () => {
    const updatedDistribution = { ...distribution, structure: selectedStructure, status: DistributionStatus.FINISHED };

    await cleanResponses();
    await (distribution.originalId
      ? replaceDistribution(updatedDistribution)
      : updateDistribution(updatedDistribution));

    handleClose();
    window.location.href = FRONT_ROUTES.homeResponses.build();
  };

  const cleanResponses = async () => {
    const validatedElements = formElementsList.filter(
      (e) => e.id && progress.historicFormElementIds.indexOf(e.id) >= 0,
    );
    const validatedQuestionIds = getAllQuestionsAndChildren(validatedElements).map((q) => q.id);
    const responsesToClean = responses.filter((r) => validatedQuestionIds.indexOf(r.questionId) < 0);
    await deleteResponses({
      formId: distribution.formId,
      responses: buildResponsesPayload(responsesToClean, distribution.id),
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      onClick={preventPropagation}
      maxWidth={BreakpointVariant.MD}
      onKeyDown={(e) => {
        if (isEnterPressed(e)) void send();
      }}
    >
      <DialogTitle color={TEXT_PRIMARY_COLOR} variant={TypographyVariant.H2} fontWeight={TypographyFontStyle.BOLD}>
        {t("formulaire.responses.send.title")}
      </DialogTitle>
      <DialogContent>
        {user && selectedStructure && user.structures.length > 1 && (
          <Stack direction="row" gap={2} alignItems={"center"} sx={{ mb: 4 }}>
            <Typography sx={{ flexShrink: 0 }}>{t("formulaire.responses.send.selectStructure")}</Typography>
            <FormControl>
              <Select value={selectedStructure} onChange={handleChange}>
                {user.structureNames.map((structure, index) => (
                  <MenuItem key={structure} value={user.structures[index]}>
                    {structure}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}
        <Box>
          <Typography>{t("formulaire.responses.send.text")}</Typography>
          <Typography>{t("formulaire.responses.send.continue")}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant={ComponentVariant.OUTLINED} onClick={handleClose}>
          {t("formulaire.cancel")}
        </Button>
        <Button
          variant={ComponentVariant.CONTAINED}
          onClick={() => {
            void send();
          }}
        >
          {t("formulaire.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
