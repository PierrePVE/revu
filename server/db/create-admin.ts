import pg from 'pg'
import { hasherMotDePasse } from '../utils/auth'
import { chargerEnvLocal } from './init'

chargerEnvLocal()

const email = process.env.ADMIN_MAIL
const password = process.env.ADMIN_PASSWORD
if (!email || !password) throw new Error('ADMIN_MAIL / ADMIN_PASSWORD manquants dans .env')

const hash = await hasherMotDePasse(password)

const client = new pg.Client({ connectionString: process.env.DATABASE_URL }) // localhost = pas de SSL, ok
await client.connect()
await client.query(
  `INSERT INTO commerces (nom, email, password_hash, slug, role)
   VALUES ('Admin', $1, $2, 'admin', 'admin')
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
  [email, hash],
)
await client.end()
console.log('✅ Admin créé/mis à jour :', email)