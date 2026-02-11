
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Sostituisci 'NOME-REPO' con il nome del tuo repository su GitHub se necessario
  base: './',
});
