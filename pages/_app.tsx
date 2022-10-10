import "../styles/index.scss";
import type {AppProps} from "next/app";
import Layout from "../layouts/Layout";
import {FC} from "react";
import Head from "next/head";
import {appWithTranslation, useTranslation} from "next-i18next";
import config from "../next-i18next.config";

const App: FC<AppProps> = (props) => {
  const {t} = useTranslation("translation");
  return (
    <>
      <Head>
        <title>{"Brandon Stryker"}</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta property="og:title" content={t("meta.titleFull")} />
        <meta property="og:description" content={t("meta.description")} />
        <meta property="og:url" content="https://www.brandonstryker.com" />
      </Head>
      <Body {...props} />
    </>
  );
};

const Body: FC<AppProps> = (props) => {
  return <Layout {...props} />;
};

export default appWithTranslation(App, config);
