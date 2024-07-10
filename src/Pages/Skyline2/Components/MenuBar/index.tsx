import React from 'react';
import './MenuBar.css';
import MenuBarLink from './MenuBarLink';

interface MenuBarProps {
    parallax: any;
}

const MenuBar: React.FC<MenuBarProps> = ({parallax}) => {
    return (
        <div className="menu-bar">
            <MenuBarLink to=".35" label="Training" parallax={parallax}/>
            <MenuBarLink to="1.1" label="Services" parallax={parallax}/>
            <MenuBarLink to="2.025" label="About Us" parallax={parallax}/>
            <MenuBarLink to="3.23" label="Contact" parallax={parallax}/>
        </div>
    );
};

export default MenuBar;