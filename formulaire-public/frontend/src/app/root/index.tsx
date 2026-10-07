import { Layout, useEdificeClient } from "@open-ent/react";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { CSS_PRIMARY_DARK_COLOR } from "~/core/style/cssColors";
function Root() {
  useEdificeClient();

  useEffect(() => {
    let observer: MutationObserver | null = null;

    const hideHeader = () => {
      const header = document.querySelector("header.no-1d") as HTMLElement;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (header) {
        // Header trouvé, on change son style
        header.style.width = "100%";
        header.style.height = "70px";
        header.style.backgroundColor = CSS_PRIMARY_DARK_COLOR;

        const nav = header.querySelector("nav") as HTMLElement;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (nav) nav.style.display = "none";

        // Arrêter l'observer puisqu'on a trouvé et caché le header
        if (observer) {
          observer.disconnect();
          observer = null;
        }

        return true; // Header trouvé et caché
      }
      return false; // Header non trouvé
    };

    // Essayer immédiatement (au cas où)
    if (!hideHeader()) {
      // Si le header n'est pas encore là, configurer l'observer
      observer = new MutationObserver(() => {
        hideHeader();
      });

      // Observer tout le document
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // Nettoyer l'observer si le composant est démonté
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default Root;
