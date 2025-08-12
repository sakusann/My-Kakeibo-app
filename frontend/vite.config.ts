import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // .envファイルはプロジェクトルート(frontendフォルダと同じ階層)に置くことを想定
  const env = loadEnv(mode, '..', '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        // この設定ファイルの場所(frontend)から見て、'src'フォルダを指す
        '@': path.resolve(__dirname, 'src'),
      },
    },
  }
})