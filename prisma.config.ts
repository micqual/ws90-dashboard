import { defineConfig } from 'prisma/config'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local manually
const envFile = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)="?([^"]*)"?$/)
    if (match) process.env[match[1]] = match[2]
  }
}

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL!,
})
