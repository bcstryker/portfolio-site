import {FC} from "react";
import {StrykerPage} from "../types";

const Home: StrykerPage = () => {
  return (
    <>
      <div className="w-full flex justify-center mb-16 mt-48">
        <h1 className="text-xl text-foreground-alt-100">Welcome!</h1>
      </div>
      <div className="w-full flex justify-center">
        <div className="w-2/3">
          <h3 className="text-xl text-foreground-alt-100 whitespace-pre-wrap text-justify">
            {
              "Hello Friend, \n\n\tMy name is Brandon and this is my site. I do not know how you ended up here but please be aware, this site is under development. The word game is fun, but not much else here works yet. Maybe play some not wordle and check back some other time."
            }
          </h3>
        </div>
      </div>
    </>
  );
};

const PageTitle: FC = () => {
  return (
    <>
      <h1 className="font-title font-medium text-foreground-alt-100 text-2xl sm:text-3xl pt-2">{"Home Page"}</h1>
      <h2 className="font-body font-normal text-foreground-alt-100 text-sm sm:text-base leading-4 sm:leading-6 mt-1">
        {"Welcome to this website!"}
      </h2>
    </>
  );
};

Home.PageTitle = PageTitle;

export default Home;
