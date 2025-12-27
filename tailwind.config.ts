import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				// Skeuomorphic retro palette
				primary: {
					DEFAULT: "#D4AF37", // Gold
					dark: "#B8941F",
					light: "#E6C95C",
				},
				secondary: {
					DEFAULT: "#8B4513", // Saddle Brown
					dark: "#6B3410",
					light: "#A0522D",
				},
				accent: {
					DEFAULT: "#DC143C", // Crimson
					dark: "#B00020",
					light: "#FF1744",
				},
				neutral: {
					DEFAULT: "#3E2723", // Dark Brown
					dark: "#1B0000",
					light: "#5D4037",
				},
				// Button states
				button: {
					disabled: "#757575",
					yellow: "#FFC107",
					green: "#4CAF50",
					red: "#F44336",
				},
			},
			boxShadow: {
				"skeu-button":
					"inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 5px rgba(0,0,0,0.3)",
				"skeu-button-pressed": "inset 0 2px 5px rgba(0,0,0,0.3)",
				"skeu-card":
					"0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
			},
			fontFamily: {
				retro: ["Press Start 2P", "cursive"],
				body: ["Roboto", "sans-serif"],
			},
		},
	},
	plugins: [],
};

export default config;
