import Image from "next/image";
import Link from "next/link";
import {FC} from "react";

import NavItems from "./NavItems";

const LeftNavbar: FC = () => {
  return (
    <div className="hidden sm:flex sm:flex-col sm:w-64 sm:fixed sm:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-background py-8 border-r border-foreground-alt-500">
        <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 mb-12">
          <div className="w-44">
            <Link href="/">
              <a aria-label="Home">
                <Image
                  src={"/stryker_logo.svg"}
                  width={300}
                  height={140}
                  layout="responsive"
                  alt={"logo"}
                  title={"STRYKER"}
                  priority
                />
              </a>
            </Link>
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
