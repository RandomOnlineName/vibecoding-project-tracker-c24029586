import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
 
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Express + MariaDB server (npm run server).
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
 