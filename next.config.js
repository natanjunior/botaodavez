const withPWA = require('next-pwa')({
	dest: 'public',
	register: true,
	skipWaiting: true,
	disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactCompiler: true,
	experimental: {
		serverActions: true,
	},
	// Silencia warning do Turbopack - next-pwa usa webpack
	turbopack: {},
};

module.exports = withPWA(nextConfig);
