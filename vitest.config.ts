import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
					exclude: ['**/*.int.test.{ts,tsx}', 'node_modules/**'],
				},
			},
			{
				extends: true,
				test: {
					name: 'integration',
					environment: 'node',
					include: ['src/**/*.int.test.{ts,tsx}'],
					globalSetup: ['tests/integration/setup-global.ts'],
					setupFiles: ['tests/integration/setup-env.ts'],
					fileParallelism: false,
					testTimeout: 60_000,
					hookTimeout: 60_000,
				},
			},
		],
	},
});
