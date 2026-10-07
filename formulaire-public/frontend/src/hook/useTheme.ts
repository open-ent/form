import { odeServices } from "@open-ent/client";
import { useEffect, useState } from "react";

import { FORMULAIRE_PUBLIC } from "../core/constants";

export const useTheme = () => {
  const [isTheme1D, setIsTheme1D] = useState(false);

  useEffect(() => {
    const getIsTheme1D = async (): Promise<void> => {
      const res = (await odeServices.conf().getConf(FORMULAIRE_PUBLIC)).theme.is1d;
      setIsTheme1D(res);
    };

    void getIsTheme1D();
  }, []);

  return { isTheme1D };
};
