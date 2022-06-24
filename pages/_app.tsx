import "../styles/index.scss";
import type {AppProps} from "next/app";
import Layout from "../layouts/Layout";
import {FC} from "react";
import Head from "next/head";

const App: FC<AppProps> = (props) => {
  return (
    <>
      <Head>
        <title>{"Brandon Stryker"}</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />

        {/* <meta property="og:title" content={t("meta.titleFull")} />
        <meta property="og:description" content={t("meta.description")} />
        <meta property="og:image" content="https://i.imgur.com/avQP3n2.jpg" />
        <meta property="og:url" content="https://app.pickle.finance" />
        <meta name="twitter:card" content="summary_large_image" /> */}
      </Head>
      <Body {...props} />
    </>
  );
};

const Body: FC<AppProps> = (props) => {
  return <Layout {...props} />;
};

export default App;
