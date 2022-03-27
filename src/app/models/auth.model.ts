import * as jwt from "jsonwebtoken";

const issueToken = async (username: string) : Promise<string>=> {
    const userToken = {username};
    const token = jwt.sign(userToken, "ExtremelySecurePrivateKey");
    return token;
}

export {issueToken}