import 'dotenv/config';

// Avant tout import du client Prisma : les tests d'intégration visent la base de test.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
