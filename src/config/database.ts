import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Safe environment variables with fallback defaults
const DB_NAME = process.env.DB_NAME || '';
const DB_USER = process.env.DB_USER || '';
const DB_PASS = process.env.DB_PASSWORD || 'AVNS_as7n2RoQPMM_DpgwlMo';
const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

// SSL CA FILE (must exist)
const DB_SSL = process.env.DB_SSL || '';

let sslConfig: any = false;

if (DB_SSL) {
  try {
    sslConfig = {
      ca: fs.readFileSync(DB_SSL),
      rejectUnauthorized: true,
    };
  } catch (err) {
    console.error("❌ SSL certificate file not found!", DB_SSL);
  }
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'production' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: sslConfig, // ⬅ FIXED
  },
});

export default sequelize;
