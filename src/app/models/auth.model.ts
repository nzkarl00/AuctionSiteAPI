import * as jwt from "jsonwebtoken";

const issueToken = async (username: string) => {
    const userToken = {username};
    const token = jwt.sign(userToken, "ExtremelySecurePrivateKey");
}

export {issueToken}