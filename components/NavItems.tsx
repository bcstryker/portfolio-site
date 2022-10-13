import { FC, MouseEventHandler } from "react";
import { ClockIcon, HeartIcon, LightningBoltIcon, TemplateIcon } from "@heroicons/react/solid";

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
    { name: t("nav.wordGame"), href: "/wordGame", icon: HeartIcon },
    { name: t("nav.clock"), href: "/clock", icon: ClockIcon },
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
