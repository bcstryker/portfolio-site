import React from 'react';

interface MenuBarLinkProps {
    to: string;
    label: string;
    parallax: any;
}

const MenuBarLink: React.FC<MenuBarLinkProps> = ({ to, label, parallax }) => {
    return (
        <p onClick={()=>parallax.current.scrollTo(to)} className="menu-bar-link">
            {label}
        </p>
    );
};

export default MenuBarLink;