import { getPool } from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";
import { hash, verify } from "./password.model";
import {issueToken} from "./auth.model";

const get = async (userId: number, auth: number) : Promise<User[]> => {
    Logger.info(`Getting user ${userId} from the database`);
    const conn = await getPool().getConnection();
    let query = 'select first_name as firstName, last_name as lastName from user where id = ?';
    if (auth === userId) {
        query = 'select first_name as firstName, last_name as lastName, email from user where id = ?';
    }
    const [ rows ] = await conn.query( query, [ userId ] );
    conn.release();
    return rows;
}

const insert = async (firstName: string, lastName: string, email: string, password: string) : Promise<ResultSetHeader> => {
    Logger.info(`Registering user ${firstName} ${lastName}`);
    const conn = await getPool().getConnection();
    const hashed = await hash(password);
    const query = 'insert into user (first_name, last_name, email, password) values (?, ?, ?, ?)';
    const [ result ] = await conn.query( query, [firstName, lastName, email, hashed]);
    conn.release();
    return result;
}

const login = async (email: string, password: string) : Promise<User[]> => {
    Logger.info(`Attempting to log in user ${email}`);
    const conn = await getPool().getConnection();
    const query = 'select password from user where user.email = ?';
    let storedPassword = await conn.query( query, [email]);
    storedPassword = storedPassword[0][0].password;
    let result = null;
    if (await verify(password, storedPassword)) {
        result = await issueToken(email);
        const storeToken = 'update user set auth_token = ? where user.email = ?'
        await conn.query(storeToken, [result, email]);
        const getToken = 'select id as userId, auth_token as token from user where user.email = ?'
        const [ ret ] = await conn.query(getToken, [email]);
        return ret;
    }
    conn.release();
    return result;
}

const logout = async (token: string) : Promise<ResultSetHeader> =>  {
    const conn = await getPool().getConnection();
    const query = 'update user set auth_token = null where auth_token = ?';
    const [ result ] = await conn.query( query, [token]);
    conn.release();
    return result;
}

const alter = async (id: number, firstName: string, lastName: string, email: string, password: string, currentPassword: string) : Promise<ResultSetHeader> => {
    Logger.info(`Updating details of user ${id}, "${firstName}"`);
    const conn = await getPool().getConnection();
    const query = 'update user set first_name = ? if ? != "" where id = ?';
    const [ result ] = await conn.query( query, [firstName, firstName, id]);
    conn.release();
    return result;
}

export {get, insert, login, alter, logout}