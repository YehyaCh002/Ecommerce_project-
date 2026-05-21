import { AppDataSource } from "./src/config/data-source";

AppDataSource.initialize().then(async () => {
    await AppDataSource.query(`UPDATE "user" SET role = 'admin' WHERE id = 1`);
    console.log('Update complete!');
    process.exit(0);
}).catch(console.error);