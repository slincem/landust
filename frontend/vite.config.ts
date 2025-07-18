import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@rendering': resolve(__dirname, 'src/rendering'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@config': resolve(__dirname, 'src/config'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  server: {
    open: true,
  },
}); 