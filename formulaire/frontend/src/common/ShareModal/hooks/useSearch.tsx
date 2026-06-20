import {
  Group,
  odeServices,
  ShareRight,
  ShareRightAction,
  ShareRightWithVisibles,
  ShareSubject,
  User,
} from "@open-ent/client";
import { OptionListItemType, useDebounce, useIsAdml } from "@open-ent/react";
import { IconBookmark } from "@open-ent/react/icons";
import { ChangeEvent, Dispatch, useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";

import { COMMON } from "~/core/constants";

import { ShareOptions } from "../ShareModal";
import { ShareAction } from "./useShare";

type State = {
  searchInputValue: string;
  searchResults: OptionListItemType[];
  searchAPIResults: ShareSubject[];
  isSearching: boolean;
};

type Action =
  | { type: "onChange"; payload: string }
  | { type: "isSearching"; payload: boolean }
  | { type: "addResult"; payloads: OptionListItemType[] }
  | { type: "addApiResult"; payloads: ShareSubject[] }
  | { type: "updateSearchResult"; payloads: OptionListItemType[] }
  | { type: "emptyResult"; payloads: OptionListItemType[] };

const initialState = {
  searchInputValue: "",
  searchResults: [],
  searchAPIResults: [],
  isSearching: false,
};

function reducer(state: State, action: Action) {
  switch (action.type) {
    case "onChange":
      return { ...state, searchInputValue: action.payload };
    case "isSearching":
      return { ...state, isSearching: action.payload };
    case "addResult":
      return { ...state, searchResults: action.payloads };
    case "addApiResult":
      return { ...state, searchAPIResults: action.payloads };
    case "updateSearchResult":
      return { ...state, searchResults: action.payloads };
    case "emptyResult":
      return { ...state, searchResults: action.payloads };
    default:
      throw new Error(`Unhandled action type`);
  }
}

const defaultActions: ShareRightAction[] = [
  {
    id: "read",
    displayName: "read",
  },
  {
    id: "comment",
    displayName: "comment",
  },
];

export const useSearch = ({
  appCode,
  resourceId,
  resourceCreatorId,
  shareRights,
  shareDispatch,
}: {
  appCode: string;
  resourceId: ShareOptions["resourceCreatorId"];
  resourceCreatorId: ShareOptions["resourceCreatorId"];
  shareRights: ShareRightWithVisibles;
  shareDispatch: Dispatch<ShareAction>;
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const debouncedSearchInputValue = useDebounce<string>(state.searchInputValue, 500);

  const { isAdml } = useIsAdml();

  const { t } = useTranslation(COMMON);

  useEffect(() => {
    void search(debouncedSearchInputValue);
  }, [debouncedSearchInputValue]);

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    dispatch({
      type: "onChange",
      payload: value,
    });
  };

  const search = async (debouncedSearchInputValue: string) => {
    if (!resourceId) return;

    dispatch({
      type: "isSearching",
      payload: true,
    });
    // start search from 1 caracter length for non Adml but start from 3 for Adml
    if ((!isAdml && debouncedSearchInputValue.length >= 1) || (isAdml && debouncedSearchInputValue.length >= 3)) {
      const resSearchShareSubjects = await odeServices
        .share()
        .searchShareSubjects(appCode, resourceId, debouncedSearchInputValue);

      dispatch({
        type: "addApiResult",
        payloads: resSearchShareSubjects,
      });

      const adaptedResults = resSearchShareSubjects
        // exclude subjects that are already in the share table
        .filter(
          (right: { id: string }) =>
            !shareRights.rights.find((shareRight: { id: string }) => shareRight.id === right.id),
        )
        // exclude owner from results
        .filter((right: { type: string; id: string }) => !(right.type === "user" && right.id === resourceCreatorId))
        .map(
          (searchResult: {
            id: string;
            displayName: string;
            type: string;
            profile?: string;
            structureName?: string;
          }) => {
            let label: string = searchResult.displayName;
            if (searchResult.type === "user" && searchResult.profile) {
              label = `${label} (${t(searchResult.profile)})`;
            } else if (searchResult.type === "group" && searchResult.structureName) {
              label = `${label} (${searchResult.structureName})`;
            }

            return {
              value: searchResult.id,
              label,
              icon: searchResult.type === "sharebookmark" ? <IconBookmark /> : null,
            };
          },
        );

      dispatch({
        type: "addResult",
        payloads: adaptedResults,
      });
    } else {
      dispatch({
        type: "emptyResult",
        payloads: [],
      });
      void Promise.resolve();
    }

    dispatch({
      type: "isSearching",
      payload: false,
    });
  };

  const handleSearchResultsChange = async (models: Array<string | number>) => {
    const shareSubject = state.searchAPIResults.find((searchAPIResult) => searchAPIResult.id === models[0]);

    if (shareSubject) {
      let rightsToAddList: ShareRight[] = [];

      if (shareSubject.type === "sharebookmark") {
        const bookmarkRes = await odeServices.directory().getBookMarkById(shareSubject.id);

        rightsToAddList.push({
          ...bookmarkRes,
          type: "sharebookmark",
          avatarUrl: "",
          directoryUrl: "",
          actions: defaultActions,
        });

        bookmarkRes.users
          .filter((user: { id: string }) => !shareRights.rights.find((right: { id: string }) => right.id === user.id))
          .forEach((user: User) => {
            rightsToAddList.push({
              ...user,
              type: "user",
              avatarUrl: "",
              directoryUrl: "",
              actions: defaultActions,
              isBookmarkMember: true,
            });
          });
        bookmarkRes.groups
          .filter((group: { id: string }) => !shareRights.rights.find((right: { id: string }) => right.id === group.id))
          .forEach((group: Group) => {
            rightsToAddList.push({
              ...group,
              type: "group",
              avatarUrl: "",
              directoryUrl: "",
              actions: defaultActions,
              isBookmarkMember: true,
            });
          });
      } else {
        rightsToAddList = [
          {
            ...shareSubject,
            actions: [
              {
                id: "read",
                displayName: "read",
              },
              {
                id: "comment",
                displayName: "comment",
              },
            ],
          },
        ];
      }

      shareDispatch({
        type: "updateShareRights",
        payload: {
          ...shareRights,
          rights: [...shareRights.rights, ...rightsToAddList],
        },
      });

      dispatch({
        type: "updateSearchResult",
        payloads: state.searchResults.filter((result) => result.value !== models[0]),
      });
    }
  };

  const showSearchNoResults = (): boolean => {
    return (
      (!state.isSearching && !isAdml && debouncedSearchInputValue.length > 0 && state.searchResults.length === 0) ||
      (!state.isSearching && isAdml && debouncedSearchInputValue.length > 3 && state.searchResults.length === 0)
    );
  };

  const showSearchAdmlHint = (): boolean => {
    return isAdml && state.searchInputValue.length < 3;
  };

  const showSearchLoading = (): boolean => {
    return state.isSearching;
  };

  const getSearchMinLength = (): number => {
    return isAdml ? 3 : 1;
  };

  return {
    state,
    showSearchAdmlHint,
    showSearchLoading,
    showSearchNoResults,
    getSearchMinLength,
    handleSearchInputChange,
    handleSearchResultsChange,
  };
};
