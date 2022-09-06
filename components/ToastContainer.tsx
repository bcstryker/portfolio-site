import {ToastContainer} from "react-toastify";

const MyToastContainer = () => (
  <ToastContainer
    toastClassName={() => "relative flex p-1 mb-2 sm:pl-48 w-48 whitespace-nowrap"}
    bodyClassName={() => "flex text-sm bg-white text-foreground-alt-400 font-med block p-3"}
    position="top-center"
    autoClose={2000}
    hideProgressBar
    newestOnTop={false}
    pauseOnFocusLoss={false}
    draggable={false}
  />
);

export default MyToastContainer;
