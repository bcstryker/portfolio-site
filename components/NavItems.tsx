import { FC, MouseEventHandler } from "react";
<<<<<<< HEAD
import { ClockIcon, HeartIcon, LightningBoltIcon, TemplateIcon } from "@heroicons/react/solid";
=======
import {
  ChartBarIcon,
  ClockIcon,
  HeartIcon,
  LightningBoltIcon,
  StarIcon,
  TemplateIcon,
  UserGroupIcon,
} from "@heroicons/react/solid";
>>>>>>> b36378d (switched all text to i18n and stubbed clock page)

import NavItem from "./NavItem";
import { useTranslation } from "react-i18next";

interface Props {
  onClick?: MouseEventHandler;
}

const NavItems: FC<Props> = ({ onClick }) => {
  const { t } = useTranslation("translation");
  const navigation = [
    { name: "Home", href: "/", icon: TemplateIcon },
    {
      name: t("nav.kanban"),
      href: "/kanban",
      icon: LightningBoltIcon,
    },
<<<<<<< HEAD
    { name: t("nav.wordGame"), href: "/wordGame", icon: HeartIcon },
    { name: t("nav.clock"), href: "/clock", icon: ClockIcon },
=======
    { name: "Word Game", href: "/wordGame", icon: HeartIcon },
    { name: "Clock", href: "/clock", icon: ClockIcon },
>>>>>>> b36378d (switched all text to i18n and stubbed clock page)
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
