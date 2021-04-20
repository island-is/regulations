import { Sequelize } from 'sequelize-typescript';

import { Regulation as DB_Regulation } from '../models/Regulation';
import { RegulationChange as DB_RegulationChange } from '../models/RegulationChange';
import { RegulationCancel as DB_RegulationCancel } from '../models/RegulationCancel';
import { Regulation_Ministry as DB_RegulationMinistry } from '../models/Regulation_Ministry';
import { Regulation_LawChapter as DB_RegulationLawChapter } from '../models/Regulation_LawChapter';
import { Ministry as DB_Ministry } from '../models/Ministry';
import { LawChapter as DB_LawChapter } from '../models/LawChapter';
import { Task as DB_RegulationTasks } from '../models/Task';

export let db: Sequelize;

export const connectSequelize = async () => {
  db = await new Sequelize({
    dialect: 'mysql',
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT ?? ''),
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
    storage: ':memory:',
    logging: process.env.DATABASE_QUERY_LOGGING === 'true',
    models: [
      DB_Regulation,
      DB_Ministry,
      DB_LawChapter,
      DB_RegulationChange,
      DB_RegulationCancel,
      DB_RegulationMinistry,
      DB_RegulationLawChapter,
      DB_RegulationTasks,
    ],
    // Options passed down to the `mysql2` driver
    pool: {
      max: Number(process.env.DATABASE_CONNECTION_LIMIT) || 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });

  return db;
};
