import {FC} from "react";
import type {NextPage} from "next";
import type {AppProps} from "next/app";
import LeftNavbar from "../components/LeftNavbar";
import TopNavbar from "../components/TopNavbar";
import {Provider} from "react-redux";
import {store} from "../store";
import ErrorBoundary from "components/ErrorBoundary";

import "react-toastify/dist/ReactToastify.css";
import MyToastContainer from "components/ToastContainer";

// Custom polyfills
// import "core-js/proposals/string-match-all";
// import "core-js/stable/array/find-index";

type Page<P = {}> = NextPage<P> & {
  PageTitle?: FC;
};

type Props = AppProps & {
  Component: Page;
};

const Layout: FC<Props> = ({Component, pageProps}) => {
  const PageTitle = Component.PageTitle ?? (() => <></>);

  return (
    <Provider store={store}>
      <LeftNavbar />
      <main className="sm:pl-64">
        <div className="px-4 py-2 sm:px-10 sm:py-10 text-foreground">
          <ErrorBoundary>
            <div>
              <TopNavbar PageTitle={PageTitle} />
              <Component {...pageProps} />
            </div>
          </ErrorBoundary>
        </div>
        <MyToastContainer />
      </main>
    </Provider>
  );
};

export default Layout;
