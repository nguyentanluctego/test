import dotenv from 'dotenv';

dotenv.config();

export const config = {
    username: process.env.USER_NAME as string,
    password: process.env.PASSWORD as string,
    phoneNumber: process.env.PHONE_NUMBER as string,
    refreshCountReset: +(process.env.REFRESH_COUNT_RESET as string),
    baseApi: process.env.BASE_API as string
}