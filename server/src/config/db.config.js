// const config = require("./index.config");
// const { Pool } = require("pg");

// const pool = new Pool({
//   user: config[config.env].db_user,
//   host: config[config.env].db_host,
//   database: config[config.env].database,
//   password: config[config.env].db_password,
//   port: 5432, // Default PostgreSQL port
// });
// module.exports = pool;

// const { PrismaClient } = require("@prisma/client");

// const prisma = new PrismaClient();

// async function main() {
// ... you will write your Prisma Client queries here
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

module.exports = prisma;
