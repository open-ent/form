import {
  Badge,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Loader,
  TextField,
  Typography,
} from "@cgi-learning-hub/ui";
import { Editor, EditorRef } from "@open-ent/react/editor";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DistributionTable } from "~/components/DistributionTable";
import { ResponsiveDialog } from "~/components/ResponsiveDialog";
import { EDITOR_CONTENT_HTML, FORMULAIRE } from "~/core/constants";
import { EditorMode } from "~/core/enums";
import { transformDistributionsToTableData } from "~/core/models/distribution/utils";
import { PRIMARY_MAIN_COLOR, TEXT_PRIMARY_COLOR } from "~/core/style/colors";
import { BreakpointVariant, ComponentVariant, TypographyFontStyle, TypographyVariant } from "~/core/style/themeProps";
import { IButtonProps, IModalProps } from "~/core/types";
import { useGlobal } from "~/providers/GlobalProvider";
import { useHome } from "~/providers/HomeProvider";
import { useGetFormDistributionsQuery } from "~/services/api/services/formulaireApi/distributionApi";
import { useSendReminderMutation } from "~/services/api/services/formulaireApi/formApi";

import { DisplayContentType } from "./enums";
import {
  buttonStyle,
  chipWrapper,
  dialogStyle,
  HiddenContent,
  loaderContainerStyle,
  mainContentColumnWrapper,
  StyledChip,
  StyledEditorContainer,
  subContentColumnWrapper,
} from "./style";
import { IStatusResponseState } from "./types";
import { chipOptions, chooseContent, createFormUrl, initialStatusResponseState } from "./utils";

export const RemindModal: FC<IModalProps> = ({ isOpen, handleClose }) => {
  const { t } = useTranslation(FORMULAIRE);
  const { isMobile, selectAllTextInput } = useGlobal();
  const { selectedForms, resetSelected } = useHome();
  const [displayContent, setDisplayContent] = useState<DisplayContentType>(DisplayContentType.LOADING);
  const [statusResponse, setStatusResponse] = useState<IStatusResponseState>(initialStatusResponseState);
  const [sendReminder] = useSendReminderMutation();
  const [showRemind, setShowRemind] = useState<boolean>(false);
  const { isAnsweredActive, isNotAnsweredActive } = statusResponse;
  const { id: formId, title: formTitle } = selectedForms[0];
  const formUrl = createFormUrl(window.location.origin, formId);
  const defaultDescription = t("formulaire.remind.default.body", {
    0: formUrl || "",
    1: formUrl || "",
  });
  const [remindObject, setRemindObject] = useState<string>(t("formulaire.remind.default.subject"));
  const editorRef = useRef<EditorRef>(null);
  const { data: distributions, isLoading: isDistributionsLoading } = useGetFormDistributionsQuery(formId);
  const tableDatas = distributions
    ? transformDistributionsToTableData(distributions, isAnsweredActive, isNotAnsweredActive)
    : [];

  const remindDescription =
    isAnsweredActive && isNotAnsweredActive
      ? "formulaire.remind.description.multipleTrue"
      : "formulaire.remind.description.multipleFalse";

  const handleSubmit = async () => {
    const description = editorRef.current?.getContent(EDITOR_CONTENT_HTML) as string;
    if (!formUrl || !description) return;

    try {
      const mail = {
        link: formUrl,
        subject: remindObject.trim().length === 0 ? t("formulaire.remind.default.subject") : remindObject,
        body: description,
      };

      await sendReminder({ formId: formId.toString(), mail }).unwrap();
      resetSelected();
      handleClose();
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  };

  const handleCancelRemind = () => {
    setShowRemind(false);
  };

  const handleChipClick = (clickedKey: keyof IStatusResponseState) => {
    setStatusResponse((prev) => {
      // build a brand new object where only clickedKey is true
      const newState = {} as IStatusResponseState;
      (Object.keys(prev) as (keyof IStatusResponseState)[]).forEach((key) => {
        newState[key] = key === clickedKey;
      });
      return newState;
    });
  };

  const getEmptyMessageForDistributionTable = () => {
    if (isNotAnsweredActive) return t("formulaire.checkremind.notanswered.empty.message");
    return t("formulaire.results.empty");
  };

  const followContent = (
    <>
      <Typography>
        {t("formulaire.checkremind.name")} <strong>{formTitle} </strong> :
      </Typography>
      <Box sx={chipWrapper}>
        {chipOptions.map((option) => (
          <StyledChip
            key={option.key}
            isActive={statusResponse[option.key]}
            label={t(option.label)}
            onClick={() => {
              handleChipClick(option.key);
            }}
          />
        ))}
        <Badge
          badgeContent={tableDatas.length}
          color="primary"
          showZero
          sx={{
            marginTop: "1.5rem",
            "& .MuiBadge-badge": {
              fontSize: "1.2rem",
              minWidth: 24,
              minHeight: 24,
              borderRadius: "50%",
            },
          }}
        >
          <GroupRoundedIcon />
        </Badge>
      </Box>
      {distributions?.length && (
        <Box>
          <DistributionTable
            distributions={tableDatas}
            emptyMessage={getEmptyMessageForDistributionTable()}
            isMobile={isMobile}
          />
        </Box>
      )}
    </>
  );

  const writeRemindContent = (
    <>
      <Typography>{t(remindDescription)}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", ...(!isMobile ? { width: "60%" } : {}) }}>
        <Typography sx={{ width: `${isMobile ? 20 : 16}rem` }}>{t("formulaire.remind.subject.label")}</Typography>
        <TextField
          variant="standard"
          fullWidth
          value={remindObject}
          onFocus={selectAllTextInput}
          onChange={(e) => {
            setRemindObject(e.target.value);
          }}
        />
      </Box>
      <StyledEditorContainer isMobile={isMobile} showRemind={showRemind}>
        {isOpen && <Editor id="postContent" content={defaultDescription} mode={EditorMode.EDIT} ref={editorRef} />}
      </StyledEditorContainer>

      <Box sx={subContentColumnWrapper}>
        <Typography>{t("formulaire.remind.link")}</Typography>
        {formUrl && (
          <Link
            href={formUrl}
            sx={{
              color: PRIMARY_MAIN_COLOR,
              textDecoration: "none",
            }}
          >
            {formUrl}
          </Link>
        )}
      </Box>
    </>
  );

  const noDistributionsContent = <Typography paddingBottom={"3rem"}>{t("formulaire.remind.noDistrib")}</Typography>;
  const loaderContent = (
    <Box sx={loaderContainerStyle}>
      <Loader />
    </Box>
  );

  const renderContent = () => {
    return (
      <>
        <HiddenContent isVisible={displayContent === DisplayContentType.WRITE_REMIND}>
          {writeRemindContent}
        </HiddenContent>
        {displayContent === DisplayContentType.NO_DISTRIBUTIONS && noDistributionsContent}
        {displayContent === DisplayContentType.LOADING && loaderContent}
        {displayContent === DisplayContentType.FOLLOW && followContent}
      </>
    );
  };

  const renderActions: () => IButtonProps[] = () => {
    switch (displayContent) {
      case DisplayContentType.WRITE_REMIND:
        return [
          {
            title: t("formulaire.cancel"),
            action: handleCancelRemind,
            variant: ComponentVariant.OUTLINED,
          },
          {
            title: t("formulaire.confirm"),
            action: () => {
              void handleSubmit();
            },
            variant: ComponentVariant.CONTAINED,
          },
        ];
      case DisplayContentType.NO_DISTRIBUTIONS:
        return [{ title: t("formulaire.close"), action: handleClose, variant: ComponentVariant.OUTLINED }];
      case DisplayContentType.LOADING:
        return [{ title: t("formulaire.close"), action: handleClose, variant: ComponentVariant.OUTLINED }];
      case DisplayContentType.FOLLOW:
        return [
          { title: t("formulaire.close"), action: handleClose, variant: ComponentVariant.OUTLINED },
          {
            title: t("formulaire.remind.title"),
            action: () => {
              setShowRemind(true);
            },
            variant: ComponentVariant.CONTAINED,
          },
        ];
      default:
        return [{ title: t("formulaire.close"), action: handleClose, variant: ComponentVariant.OUTLINED }];
    }
  };

  useEffect(() => {
    setDisplayContent(chooseContent(isDistributionsLoading, distributions, showRemind));
  }, [isDistributionsLoading, distributions, showRemind]);

  useEffect(() => {
    if (!isOpen) {
      setShowRemind(false);
    }
  }, [isOpen]);

  return (
    <ResponsiveDialog
      open={isOpen}
      onClose={handleClose}
      maxWidth={BreakpointVariant.MD}
      fullWidth
      slotProps={dialogStyle}
    >
      <DialogTitle color={TEXT_PRIMARY_COLOR} variant={TypographyVariant.H2} fontWeight={TypographyFontStyle.BOLD}>
        {t("formulaire.remind.title")}
      </DialogTitle>
      <DialogContent sx={mainContentColumnWrapper}>{renderContent()}</DialogContent>
      <DialogActions>
        {renderActions().map((button) => (
          <Button
            key={button.title}
            variant={button.variant ?? ComponentVariant.CONTAINED}
            onClick={() => {
              void button.action();
            }}
            sx={buttonStyle}
          >
            {t(button.title)}
          </Button>
        ))}
      </DialogActions>
    </ResponsiveDialog>
  );
};
