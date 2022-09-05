import {Dispatch, FC, SetStateAction} from "react";
import {classNames} from "utils";
import {v4 as uuid} from "uuid";

const Keyboard: FC<props> = ({className, setPressedKey, setShit}) => {
  const handleUserKeyPress = (key: string) => {
    setPressedKey(key);
    setShit(uuid());
  };
  return (
    <div className={classNames(className)}>
      <div className="w-full flex justify-center">
        {row1.split("").map((c) => (
          <p
            key={c}
            className="w-12 hover:cursor-pointer bg-foreground-alt-300 border border-white rounded-md p-4 mr-1"
            onClick={() => handleUserKeyPress(c)}
          >
            {c.toUpperCase()}
          </p>
        ))}
      </div>
      <div className="w-full flex justify-center mt-1">
        {row2.split("").map((c) => (
          <p
            key={c}
            className="w-12 hover:cursor-pointer bg-foreground-alt-300 border border-white rounded-md p-4 mr-1"
            onClick={() => handleUserKeyPress(c)}
          >
            {c.toUpperCase()}
          </p>
        ))}
      </div>
      <div className="w-full flex justify-center mt-1">
        <p
          className="w-24 hover:cursor-pointer bg-foreground-alt-300 border border-white rounded-md p-4 mr-1"
          onClick={() => handleUserKeyPress("enter")}
        >
          {"ENTER"}
        </p>
        {row3.split("").map((c) => (
          <p
            key={c}
            className="w-12 hover:cursor-pointer bg-foreground-alt-300 border border-white rounded-md p-4 mr-1"
            onClick={() => handleUserKeyPress(c)}
          >
            {c.toUpperCase()}
          </p>
        ))}
        <p
          className="w-12 hover:cursor-pointer bg-foreground-alt-300 border border-white rounded-md p-4"
          onClick={() => handleUserKeyPress("backspace")}
        >
          &#9003;
        </p>
      </div>
    </div>
  );
};

const row1 = "qwertyuiop";
const row2 = "asdfghjkl";
const row3 = "zxcvbnm";

interface props {
  className?: string;
  setPressedKey: Dispatch<SetStateAction<string>>;
  setShit: Dispatch<SetStateAction<string>>;
}

export default Keyboard;
