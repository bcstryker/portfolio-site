import {FC} from "react";

import NavItems from "./NavItems";

const LeftNavbar: FC<{className?: string}> = ({className}) => {
  return (
    <div className={"hidden sm:flex sm:flex-col sm:w-64 sm:fixed sm:inset-y-0" + ` ${className}`}>
      <div className="flex-1 flex flex-col min-h-0 bg-background py-8 border-r border-foreground-alt-500">
        <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 mb-12">
          <div className="w-44">
            <p className="text-3xl text-foreground-alt-100">BRANDON STRYKER</p>
            <p className="text-foreground-alt-100">Developer Showcase</p>
          </div>
        </div>
        <div className="flex flex-col grow justify-between px-10">
          <div className="flex flex-col overflow-y-auto">
            <NavItems />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftNavbar;
