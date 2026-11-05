import type {Metadata} from "next";
import Lobby from "./lobby";

export const metadata: Metadata = {title: "Game lobby | Brandon Stryker"};
export default function LobbyPage() {
  return <Lobby />;
}
