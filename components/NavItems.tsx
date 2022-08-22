import {FC, MouseEventHandler} from "react";
import {
  AcademicCapIcon,
  ChartBarIcon,
  HeartIcon,
  LightningBoltIcon,
  SpeakerphoneIcon,
  StarIcon,
  TemplateIcon,
  UserGroupIcon,
} from "@heroicons/react/solid";

import NavItem from "./NavItem";

interface Props {
  onClick?: MouseEventHandler;
}

const NavItems: FC<Props> = ({onClick}) => {
  const navigation = [
    {name: "Home", href: "/", icon: TemplateIcon},
    {
      name: "Productivity",
      href: "/productivity",
      icon: LightningBoltIcon,
    },
    {name: "People", href: "/b", icon: UserGroupIcon},
    {name: "Star", href: "/c", icon: StarIcon},
    {name: "Word Game", href: "/wordGame", icon: HeartIcon},
    {name: "Stats", href: "/e", icon: ChartBarIcon},
  ];

  return (
    <nav className="flex-1 space-y-2">
      {navigation.map((item) => (
        <NavItem key={item.name} Icon={item.icon} href={item.href} onClick={onClick}>
          {item.name}
        </NavItem>
      ))}
    </nav>
  );
};

export default NavItems;
