import {FC} from "react";
import {StrykerPage} from "../types";

const Home: StrykerPage = () => {
  return (
    <>
      {/* <div className="block xl:flex mb-8 sm:mb-10">
        <div className="flex justify-center items-center"> */}
      <div className="block xl:flex mb-8 sm:mb-10">
        <div className="w-full flex justify-center">
          <h1 className="text-xl text-foreground-alt-100">Welcome!</h1>
        </div>
      </div>
    </>
  );
};

const PageTitle: FC = () => {
  return (
    <>
      <h1 className="font-title font-medium text-2xl sm:text-3xl pt-2">{"Home Page"}</h1>
      <h2 className="font-body font-normal text-foreground-alt-200 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {"Welcome to this website!"}
      </h2>
    </>
  );
};

Home.PageTitle = PageTitle;

export default Home;
