import {ThemeState} from "../../store/theme";

type RGB = [r: number, g: number, b: number];
type Tone = "light" | "dark";

interface Theme {
  tone: Tone;
  colors: {
    accent: RGB;
    "accent-light": RGB;
    "accent-red": RGB;
    "accent-yellow": RGB;
    "accent-green": RGB;
    background: RGB;
    "background-glow": RGB;
    "background-light": RGB;
    "background-lightest": RGB;
    foreground: RGB;
    "foreground-button": RGB;
    "foreground-alt-100": RGB;
    "foreground-alt-200": RGB;
    "foreground-alt-300": RGB;
    "foreground-alt-400": RGB;
    "foreground-alt-500": RGB;
    primary: RGB;
    "primary-light": RGB;
    "primary-dark": RGB;
  };
}

interface ThemeConfig {
  dark: Theme;
  light: Theme;
  [key: string]: Theme | undefined;
}

/**
 * Custom theme definitions
 */
const themes: ThemeConfig = {
  dark: {
    tone: "dark",
    colors: {
      accent: [129, 47, 245],
      "accent-light": [166, 108, 245],
      "accent-red": [220, 38, 38],
      "accent-yellow": [253, 223, 71],
      "accent-green": [131, 204, 22],
      background: [62, 76, 99],
      "background-glow": [5, 245, 225],
      "background-light": [102, 118, 145],
      "background-lightest": [166, 188, 222],
      foreground: [255, 255, 255],
      "foreground-button": [255, 255, 255],
      "foreground-alt-100": [224, 225, 226],
      "foreground-alt-200": [192, 196, 197],
      "foreground-alt-300": [134, 148, 152],
      "foreground-alt-400": [43, 56, 59],
      "foreground-alt-500": [31, 45, 48],
      primary: [0, 80, 209],
      "primary-light": [56, 131, 252],
      "primary-dark": [1, 42, 107],
    },
  },
  light: {
    tone: "light",
    colors: {
      accent: [239, 114, 80],
      "accent-light": [255, 147, 117],
      "accent-red": [220, 38, 38],
      "accent-yellow": [253, 223, 71],
      "accent-green": [131, 204, 22],
      background: [252, 255, 252],
      "background-glow": [146, 243, 145],
      "background-light": [211, 249, 207],
      "background-lightest": [235, 255, 236],
      foreground: [60, 70, 60],
      "foreground-button": [252, 255, 252],
      "foreground-alt-100": [190, 233, 191],
      "foreground-alt-200": [158, 195, 159],
      "foreground-alt-300": [134, 166, 135],
      "foreground-alt-400": [111, 137, 111],
      "foreground-alt-500": [95, 118, 95],
      primary: [72, 194, 72],
      "primary-light": [46, 203, 45],
      "primary-dark": [6, 85, 6],
    },
  },
};

export const currentTheme = (options: ThemeState): Theme => {
  const {type} = options;

  switch (type) {
    default:
      return themes[type];
  }
};

export const matchingLogoSrc = (options: ThemeState): string => {
  const theme = currentTheme(options);

  return `/pickle-logo-${theme.tone}.svg`;
};

export const applyTheme = (options: ThemeState) => {
  const root = document.documentElement;
  const theme = currentTheme(options);

  const variables = Object.entries(theme.colors).map(
    ([property, rgb]) => `--color-${property}: ${rgb[0]}, ${rgb[1]}, ${rgb[2]}`
  );

  root.setAttribute("style", variables.join(";"));
};
